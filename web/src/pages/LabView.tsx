import { useParams } from "react-router-dom";
import { getLesson } from "../content";
import { NotFoundPage } from "./NotFoundPage";
import { Card } from "../components/Card";
import { LessonStepper } from "../components/LessonStepper";

export default function LabView() {
    const { slug } = useParams<{ slug: string }>();
    const lab = slug ? getLesson(slug) : undefined;

    if (!lab) {
        return <NotFoundPage />;
    }

    return (
        <Card as="main" title={lab.outcome} titleLevel="h2" className="outcome">
            <LessonStepper lesson={lab} />
        </Card>
    );
}