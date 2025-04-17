// 自定义滚动条CSS
export const scrollbarCSS = `
/* 给结果区域添加自定义滚动条 */
.result-content::-webkit-scrollbar {
  width: 2px !important;
  height: 0px !important;
}
.result-content::-webkit-scrollbar-track {
  background-color: transparent !important;
}
.result-content::-webkit-scrollbar-thumb {
  background-color: transparent !important;
  border-radius: 2px !important;
  transition: background-color 0.2s ease-in-out !important;
}
.result-content:hover::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.15) !important;
}
/* 确保Firefox也有同样的效果 */
.result-content {
  scrollbar-width: thin !important;
  scrollbar-color: transparent transparent !important;
  transition: scrollbar-color 0.2s ease-in-out !important;
}
.result-content:hover {
  scrollbar-color: rgba(0, 0, 0, 0.15) transparent !important;
}
`;

// 添加光标CSS动画
export const cursorCSS = `
.typing-cursor {
  display: inline-block;
  width: 5px;
  height: 5px;
  background-color: #000;
  margin-left: 2px;
  margin-right: 1px;
  border-radius: 50%;
  vertical-align: middle;
  animation: blink 0.7s infinite;
  position: relative;
  bottom: 1px;
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
}
`;

// 行截断CSS
export const lineClampCSS = `
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;
