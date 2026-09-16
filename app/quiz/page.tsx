// app/quiz/page.tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import CollectionQuiz from "@/components/collection-quiz";

export default function QuizPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400 px-6 py-10">Loading quiz...</p>}>
      <QuizLoader />
    </Suspense>
  );
}

async function QuizLoader() {
  const supabase = await createClient();

  const { data: artFolder } = await supabase
    .from("folders")
    .select("id")
    .ilike("name", "art")
    .maybeSingle();

  if (!artFolder) {
    return (
      <p className="text-sm text-gray-400 px-6 py-10">
        No "art" folder found yet — create one and this quiz will use its images.
      </p>
    );
  }

  const { data: imageLinks, error } = await supabase
    .from("image_folders")
    .select("images(id, url, title, artist, color, medium, subject_matter)")
    .eq("folder_id", artFolder.id);

  if (error) {
    return <p className="text-sm text-red-500 px-6 py-10">Error loading images: {error.message}</p>;
  }

  const images = (imageLinks?.map((l) => l.images).filter(Boolean) ?? []) as any[];

  if (images.length === 0) {
    return <p className="text-sm text-gray-400 px-6 py-10">No images in the "art" folder yet.</p>;
  }

  return <CollectionQuiz images={images} />;
}