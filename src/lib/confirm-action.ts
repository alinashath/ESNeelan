import { Alert, Platform } from "react-native";

export type ConfirmActionOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Cross-platform confirm. On web, multi-button Alert.alert often never fires
 * button callbacks, so we use window.confirm instead.
 */
export function confirmAction(options: ConfirmActionOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmLabel = "Continue",
    cancelLabel = "Cancel",
    destructive = false,
  } = options;

  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });
}
