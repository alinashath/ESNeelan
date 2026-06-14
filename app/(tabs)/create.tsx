import { Redirect, type Href } from "expo-router";

export default function CreateTabEntry() {
  return <Redirect href={"/create/step1-details" as Href} />;
}
