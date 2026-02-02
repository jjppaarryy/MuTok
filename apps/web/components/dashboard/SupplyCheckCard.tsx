import VarietyRing from "../VarietyRing";

type SupplyCheckCardProps = {
  hooksTarget: number;
  hooksValue: number;
  snippetsTarget: number;
  snippetsValue: number;
  clipsTarget: number;
  clipsValue: number;
  montageAllowed: boolean;
  avgClipsPerPost: number;
};

export default function SupplyCheckCard({
  hooksTarget,
  hooksValue,
  snippetsTarget,
  snippetsValue,
  clipsTarget,
  clipsValue,
  montageAllowed,
  avgClipsPerPost
}: SupplyCheckCardProps) {
  return (
    <section className="grid-3">
      <VarietyRing
        label="Hooks"
        value={hooksValue}
        target={hooksTarget}
        hint="Enough unique hooks for the week."
      />
      <VarietyRing
        label="Snippets"
        value={snippetsValue}
        target={snippetsTarget}
        hint="Approved snippets to rotate."
      />
      <VarietyRing
        label="Clips"
        value={clipsValue}
        target={clipsTarget}
        hint={
          montageAllowed
            ? `Includes montage needs (avg ${avgClipsPerPost.toFixed(1)} clips/post).`
            : "Visual variety for the week."
        }
      />
    </section>
  );
}
