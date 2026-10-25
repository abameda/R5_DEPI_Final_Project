import { Empty, TextLink } from "../components/ui";
import { t } from "../lib/i18n";

export default function NotFound() {
  return <Empty title={t("This page does not exist", "هذه الصفحة غير موجودة")} hint={t("The link may be outdated.", "ربما يكون الرابط قديمًا.")}
    action={<TextLink to="/">{t("Back to the overview", "العودة إلى النظرة العامة")}</TextLink>} />;
}
