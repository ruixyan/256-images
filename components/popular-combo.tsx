// components/popular-combo.tsx
type ImageLite = {
  id: string;
  url: string;
  title: string | null;
  color: string | null;
  medium: string | null;
  subject_matter: string | null;
};

export default function PopularCombo({
  items,
}: {
  items: { image: ImageLite; colorRank: number; mediumRank: number; subjectRank: number }[];
}) {
  if (items.length === 0) return null;

  const widestLevel = Math.max(...items.flatMap((i) => [i.colorRank, i.mediumRank, i.subjectRank])) + 1;

  return (
    <div className="px-4 py-3 border-b bg-white shrink-0">
      <p className="text-xs text-gray-400 mb-2">
        Most popular color, medium &amp; subject matter
        {widestLevel > 1 && ` — widened to the top ${widestLevel} of each category to reach 9`}
      </p>
      <div className="flex gap-3 overflow-x-auto">
        {items.map(({ image }) => (
          <div key={image.id} className="shrink-0 w-24 text-center">
            <img
              src={image.url}
              alt={image.title ?? ""}
              className="w-24 h-24 object-cover rounded border"
            />
            <p className="text-[10px] text-gray-500 mt-1 truncate">{image.title ?? "Untitled"}</p>
            <p className="text-[9px] text-gray-400 truncate">
              {image.color} · {image.medium} · {image.subject_matter}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}