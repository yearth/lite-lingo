# Chrome 扩展翻译应用架构设计

## 架构概览

```
+-----------------+      +------------------+      +--------------------+
|                 |      |                  |      |                    |
|  Content Script |<---->| Background Script|<---->|    后端API服务     |
|  (UI层)         |      | (请求协调层)      |      |    (翻译服务)      |
|                 |      |                  |      |                    |
+-----------------+      +------------------+      +--------------------+
        ^                         ^
        |                         |
        v                         v
+-----------------+      +------------------+
|                 |      |                  |
|  Zustand Store  |      |   React Query    |
|  (UI状态管理)    |      |   (数据缓存)     |
|                 |      |                  |
+-----------------+      +------------------+
```

## 核心组件职责

### 1. 事件处理层

**Background Script (事件监听中心)**

- 负责全局事件监听和处理
- 管理所有长连接和消息传递
- 处理扩展生命周期事件(安装、更新等)

```typescript
chrome.runtime.onMessage.addListener(messageHandler);
chrome.action.onClicked.addListener(actionHandler);
```

**Content Script (UI 事件)**

- 处理 DOM 相关事件(选择文本、点击等)
- 将 UI 事件转换为消息发送到 Background

### 2. 请求处理层

**Background Script (请求协调中心)**

- 维护全局`queryClient`实例
- 管理所有 API 请求生命周期
- 处理请求取消和流式数据
- 将数据写入缓存

```typescript
// 请求管理
const activeRequests = new Map<string, AbortController>();

// 请求方法
function handleTranslationRequest(request, sender) {
  // 发起API请求并管理流
}

// 请求取消
function cancelRequest(requestId) {
  // 取消活动请求
}
```

**后端 API 服务**

- 提供翻译 API 端点
- 处理实际翻译逻辑
- 返回流式响应

### 3. 数据缓存层

**React Query (缓存中心)**

- 位于 Background Script 中
- 管理所有查询缓存
- 处理缓存失效策略
- 维护请求状态(loading, error 等)

```typescript
// 缓存配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 数据5分钟内保持新鲜
      gcTime: 1000 * 60 * 15, // 15分钟后垃圾回收
    },
  },
});

// 缓存结果
queryClient.setQueryData(cacheKey, result);
```

**Zustand Store (UI 状态)**

- 位于 Content Script 中
- 管理 UI 相关状态(面板可见性、当前文本等)
- 不存储 API 响应数据，只引用缓存数据

## 数据流向

### 翻译请求流程

1. **触发事件** (Content Script)

   - 用户选择文本
   - Zustand Store 更新状态
   - 发送消息到 Background

2. **请求协调** (Background Script)

   - 检查缓存是否有结果
   - 如果缓存命中，直接返回
   - 否则创建新请求，分配请求 ID
   - 通过消息将请求 ID 返回给 Content Script

3. **请求执行** (Background Script)

   - 创建 AbortController 管理请求生命周期
   - 发起流式请求到后端 API
   - 接收流式响应

4. **数据流回** (Background -> Content)

   - 解码响应流
   - 将数据块通过消息传递给 Content Script
   - 同时将完整结果缓存到 React Query

5. **UI 更新** (Content Script)
   - 接收数据块
   - 更新 Zustand Store
   - UI 呈现最新翻译

### 数据缓存策略

1. **查询缓存** (React Query in Background)

   - 使用`[text, sourceLang, targetLang]`作为缓存键
   - 默认 5 分钟 staleTime (数据保持新鲜)
   - 15 分钟 gcTime (垃圾回收)

2. **状态缓存** (Zustand in Content)
   - 仅存储当前会话的 UI 状态
   - 不持久化 API 响应数据
   - 页面刷新时重置

## 通信机制

### 消息类型

```typescript
// Content -> Background
{
  type: "TRANSLATE_TEXT",
  payload: { text, sourceLang, targetLang }
}

// Background -> Content (流)
{
  type: "TRANSLATION_CHUNK",
  payload: "部分翻译文本",
  requestId: "xxx"
}

// Background -> Content (完成)
{
  type: "TRANSLATION_COMPLETE",
  requestId: "xxx"
}

// Content -> Background
{
  type: "CANCEL_TRANSLATION",
  requestId: "xxx"
}
```

### 消息处理

- 使用`requestId`关联请求和响应
- 使用单向消息流，避免复杂回调
- Background 保持单一事件处理程序，根据消息类型分发

## 流式翻译实现

### 流程图

```
Content Script            Background Script           API服务
    |                           |                       |
    |--- TRANSLATE_TEXT ------->|                       |
    |                           |--- 发起流式请求 ------>|
    |                           |<-- 流数据块 1 ---------|
    |<-- TRANSLATION_CHUNK -----|                       |
    |                           |<-- 流数据块 2 ---------|
    |<-- TRANSLATION_CHUNK -----|                       |
    |                           |<-- 流数据块 n ---------|
    |<-- TRANSLATION_CHUNK -----|                       |
    |                           |<-- 响应结束 -----------|
    |<-- TRANSLATION_COMPLETE --|                       |
    |                           |                       |
```

### 流数据处理

1. **请求发起**

   ```typescript
   // Background Script
   async function handleTranslationRequest(request, sender) {
     const abortController = new AbortController();
     activeRequests.set(requestId, abortController);

     // 流式API请求
     const response = await fetch("https://api.translation.com/translate", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(request),
       signal: abortController.signal,
     });

     // 处理流式响应
     const reader = response.body.getReader();
     const decoder = new TextDecoder();

     // 读取流数据
     while (true) {
       const { done, value } = await reader.read();
       if (done) break;

       const chunk = decoder.decode(value, { stream: true });

       // 发送数据块到Content Script
       chrome.tabs.sendMessage(sender.tab.id, {
         type: "TRANSLATION_CHUNK",
         payload: chunk,
         requestId,
       });
     }

     // 流结束
     chrome.tabs.sendMessage(sender.tab.id, {
       type: "TRANSLATION_COMPLETE",
       requestId,
     });
   }
   ```

2. **流取消处理**
   ```typescript
   // Background Script
   function cancelRequest(requestId) {
     const controller = activeRequests.get(requestId);
     if (controller) {
       controller.abort();
       activeRequests.delete(requestId);
     }
   }
   ```

## 架构优势

1. **关注点分离**

   - Background: 数据处理和缓存
   - Content: UI 呈现和用户交互
   - 通过消息明确边界

2. **资源优化**

   - 请求仅在 Background 执行，减少重复
   - 流式处理减少内存占用
   - 缓存策略减少不必要的网络请求

3. **可扩展性**

   - 消息系统易于扩展新功能
   - 缓存策略易于调整
   - 请求处理逻辑集中，便于维护

4. **错误隔离**
   - Background 错误不影响 UI 操作
   - 单个请求失败不影响其他功能

## 实现建议

1. **错误处理**

   - 为每种可能的错误定义明确的消息类型
   - 在 UI 层显示友好的错误消息
   - 实现错误重试机制

2. **性能优化**

   - 对频繁翻译的短文本进行特殊缓存
   - 实现批量翻译请求合并
   - 对翻译结果进行客户端持久化存储

3. **用户体验**
   - 实现翻译进度指示器
   - 添加错误恢复提示
   - 提供网络问题的离线模式
