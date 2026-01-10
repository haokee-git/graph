# 修改计划：UI 样式优化与错误处理

根据您的需求，我们将进行以下修改：

## 1. 优化边标签样式 (`Renderer.ts`)
*   修改 `draw` 方法中绘制 `edge.label` 的部分。
*   使用 `measureText` 获取文本宽度。
*   绘制一个圆角矩形背景：
    *   填充色：`#f5f5f5`（与背景一致）。
    *   边框：灰色虚线 (`setLineDash([5, 5])`)。
    *   文本居中显示在矩形内。

## 2. 边节点长度限制与错误处理 (`GraphParser.ts` & `App.tsx`)
*   **GraphParser**:
    *   在解析时检查节点编号（label）长度是否超过 3。
    *   如果超过，记录错误信息（包含行号）。
    *   返回一个 `ParserResult` 对象，包含 `error` 信息。
*   **App.tsx**:
    *   接收 `GraphParser` 的结果。
    *   如果有错误：
        *   在图片下方显示红色错误提示条。
        *   传递错误行号给 Monaco Editor，设置行高亮装饰 (Decorations)。

## 3. 字体调整与 CodeFont 移除 (`index.css` & `App.tsx`)
*   **CSS**:
    *   修改 `@font-face`，移除 `CodeFont`。
    *   修改全局字体设置，`BodyFont` 应用于所有元素。
*   **App.tsx**:
    *   修改 Editor 配置：`fontFamily: 'Consolas, "Courier New", monospace'`。
*   **文件清理**:
    *   删除 `d:\graph\fonts\CodeFont.ttf`。
    *   删除 `d:\graph\public\fonts` 及其内容（如果存在）。

## 执行步骤
1.  **字体清理**：修改 CSS，删除字体文件。
2.  **样式优化**：修改 `Renderer.ts` 实现圆角矩形标签。
3.  **逻辑增强**：修改 `GraphParser.ts` 添加长度检查。
4.  **UI 集成**：修改 `App.tsx` 处理错误显示和编辑器高亮。
5.  **验证**：重启验证。
