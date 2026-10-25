import { Empty, TextLink } from "../components/ui";

export default function NotFound() {
  return <Empty title="This page does not exist" hint="The link may be outdated." action={<TextLink to="/">Back to the overview</TextLink>} />;
}
