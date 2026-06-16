import { Stack, type Href } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { AdminStackIndexBack } from "@/src/components/ui/AdminStackIndexBack";
import { makeRootStackBackHeader } from "@/src/components/ui/RootStackBackButton";

export default function AdminArticlesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Featured articles",
          headerLeft: () => <AdminStackIndexBack />,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: "New article",
          headerLeft: makeRootStackBackHeader("/admin/articles" as Href, colors.text),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Edit article",
          headerLeft: makeRootStackBackHeader("/admin/articles" as Href, colors.text),
        }}
      />
    </Stack>
  );
}
