import { Alert, Platform, Share } from "react-native";

type ShareListingOptions = {
  title: string;
  /** Descriptive body text without the URL. */
  message: string;
  url: string;
};

/** Share a listing link without duplicating the URL in the message body. */
export async function shareListing({
  title,
  message,
  url,
}: ShareListingOptions): Promise<void> {
  try {
    if (Platform.OS === "web") {
      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      if (nav?.share && url) {
        try {
          await nav.share({ title, text: message, url });
          return;
        } catch (e) {
          if ((e as { name?: string })?.name === "AbortError") return;
        }
      }
      if (url && nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        Alert.alert("Copied", "Listing link copied to clipboard.");
        return;
      }
      Alert.alert("Share", url ? `${message}\n${url}` : message);
      return;
    }

    if (Platform.OS === "android") {
      const text = url ? `${message}\n${url}` : message;
      await Share.share({ title, message: text });
      return;
    }

    await Share.share(url ? { title, message, url } : { title, message });
  } catch {
    Alert.alert("Share", "Could not open the share sheet.");
  }
}
