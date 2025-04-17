export const InlineStyle = ({ css }: { css: string }) => (
  <style dangerouslySetInnerHTML={{ __html: css }} />
);
