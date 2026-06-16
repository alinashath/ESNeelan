import { Easing } from "react-native-reanimated";

/**
 * Motion timing aligned with `.agents/skills/ui-animation` (RN uses Reanimated, not CSS).
 * Button / small control feedback: ~100–160ms, “enter” curve.
 */
export const easingEnter = Easing.bezier(0.22, 1, 0.36, 1);
export const easingMove = Easing.bezier(0.25, 1, 0.5, 1);

export const durationPressInMs = 115;
export const durationPressOutMs = 165;
export const durationPanelOpenMs = 220;
export const durationPanelCloseMs = 140;

/** Featured / catalog imagery — hover zoom (web), ease-out both directions */
export const durationPhotoHoverMs = 420;
export const easingPhotoHover = Easing.out(Easing.cubic);
