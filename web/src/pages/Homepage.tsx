import { ModulesList } from "../components/ModulesList";
import { PageLayout } from "../components/PageLayout";

export function Homepage() {
  return (
    <PageLayout heading={<h1>Modules</h1>}>
      <ModulesList />
    </PageLayout>
  )
}
