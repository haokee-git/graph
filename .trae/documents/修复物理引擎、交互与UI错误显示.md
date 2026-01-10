# 修改计划：修复物理引擎、交互与UI错误显示

根据您的反馈，我们需要解决以下 5 个核心问题。以下是详细的实施计划：

## 1. 修复错误信息不显示的问题 (`App.tsx`)
目前高亮行已生效，但下方的错误信息未显示。
*   **原因分析**：可能是错误容器被遮挡，或者 `errors` 状态更新后组件未正确重绘，或者高度限制导致内容不可见。从截图看，底部只有作者信息，没有红色的错误条。
*   **修改方案**：
    *   检查 `App.tsx` 中 `Error Display` 部分的布局。
    *   确保错误信息容器位于 `canvas` 所在的 `Box` 内部，且 `z-index` 足够高，或者位于底部面板上方。
    *   目前它位于 canvas 容器底部，可能因为 `overflow: hidden` 或 flex 布局挤压导致不可见。将显式设置其绝对定位或调整 flex 权重。

## 2. 修正物理拉力逻辑 (`PhysicsEngine.ts`)
您指出拉力应该与 `|目前长度 - 目标长度|` 成正比，且现在似乎没有效果。
*   **现状**：代码中已经是胡克定律 `force = (dist - edge.restLength) * k`。
*   **问题所在**：我们在之前的修改中加入了一个 `LENGTH_ADJUST_RATE`，让 `restLength` 每帧自动逼近 `idealLength`。这导致 `restLength` 几乎总是等于当前物理距离（因为没有外力拉扯时，弹簧会瞬间平衡）。
*   **修改方案**：
    *   **移除/大幅减弱动态长度调整**：如果想要弹簧效果，`restLength` 应该保持固定（即 `idealLength`），或者调整得非常慢，让弹簧有机会通过物理力进行收缩/拉伸。
    *   将 `LENGTH_ADJUST_RATE` 设为 0 或者非常小的值，或者仅在初始化时设定 `restLength`，之后让物理引擎去收敛。建议改为：初始化时 `restLength` 设为当前距离（防止瞬移），然后以极慢速度（或不调整）趋向 `idealLength`，主要靠弹力拉扯节点移动。

## 3. 限制斥力范围 (`PhysicsEngine.ts`)
*   **修改方案**：在计算斥力循环中，增加距离判断。
    *   计算两个节点的斥力有效半径：`limit = 5 * (r1 + r2)`。
    *   如果 `dist > limit`，则跳过斥力计算。

## 4. 修复缩放下的交互与悬停高亮 (`App.tsx` & `Renderer.ts`)
*   **问题**：缩放后坐标系变化，鼠标事件的 `clientX/Y` 直接减去 offset 得到的坐标与画布内的逻辑坐标不一致。
*   **修改方案**：
    *   **坐标转换**：在 `handleMouseDown/Move` 中，将屏幕坐标转换为世界坐标。
        *   `worldX = (screenX - centerX) / scale + centerX`（假设缩放中心是画布中心）。
        *   需要将 `offsetX/Y`（平移量）也考虑进去（见第 5 点）。
    *   **悬停高亮**：
        *   在 `Renderer` 中增加 `hoveredNodeId` 属性。
        *   在 `App.tsx` 的 `handleMouseMove` 中检测悬停节点，并更新 `Renderer`。
        *   `Renderer.drawNode` 中，如果节点是 `hoveredNodeId`，绘制蓝色光晕或边框。

## 5. 实现画布平移（拖动背景） (`App.tsx` & `Renderer.ts`)
*   **修改方案**：
    *   **Renderer**：增加 `offsetX`, `offsetY` 属性，用于 `ctx.translate`。
    *   **App**：
        *   增加 `isPanning` 状态。
        *   `handleMouseDown`：如果未点中节点，则 `isPanning = true`，记录起始位置。
        *   `handleMouseMove`：如果 `isPanning`，计算 `delta`，更新 `renderer.offsetX/Y`。注意：平移量不需要除以 scale，因为 translate 通常在 scale 之前或之后，取决于实现顺序。通常是 `translate(pan) -> scale -> translate(center)`。

## 执行顺序
1.  **物理引擎**：修改斥力范围、弹簧逻辑。
2.  **渲染器**：增加 `offsetX/Y`，`hoveredNode`，修改 `draw` 支持平移。
3.  **交互逻辑**：修改 `App.tsx`，实现坐标转换（屏幕 -> 世界），处理节点拖动、画布平移、悬停检测。
4.  **UI 修复**：调整错误信息显示位置。
5.  **验证**：构建重启。
