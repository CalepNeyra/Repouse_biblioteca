import { Library } from "@/components/library";
export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) { return <Library mode="author" authorId={(await params).id} />; }
