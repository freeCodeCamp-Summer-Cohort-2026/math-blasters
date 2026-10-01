import { ModulesList } from "../components/ModulesList";
import { PageLayout } from "../components/PageLayout";
import { SignInPrompt } from "../components/SignInPrompt/SignInPrompt";

export function Homepage() {
  return (
    <PageLayout
      className="modules-page"
      heading={<h1 className="modules-page__title">Modules</h1>}
    >
      <SignInPrompt surface="modules" />
      <ModulesList />
    </PageLayout>
  )
}
