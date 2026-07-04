'use client';

function Section({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-200">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReflectionSummary({ content, kind }) {
  if (!content) return null;
  return (
    <div className="space-y-4">
      <Section title="Main emotions" items={content.mainEmotions} />
      <Section title="Main events" items={content.mainEvents} />
      <Section title="Recurring patterns" items={content.recurringPatterns} />
      <Section title="Handled well" items={content.handledWell} />
      <Section title="Could work on" items={content.workOn} />
      <Section title="Suggested next steps" items={content.nextSteps} />
      {kind === 'monthly' && (
        <>
          <Section title="Long-term patterns" items={content.longTermPatterns} />
          <Section title="Goal progress" items={content.goalProgress} />
          <Section title="Possible blind spots" items={content.blindSpots} />
          {content.visionStillFits === false && content.updatedVision && (
            <div className="rounded-xl border border-neuron2/30 bg-neuron2/10 p-3">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neuron2">
                Your plan evolved this month
              </p>
              <p className="text-sm text-slate-200">{content.updatedVision}</p>
              {content.updatedPlanSteps?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {content.updatedPlanSteps.map((step, i) => (
                    <li key={i} className="text-sm text-slate-300">
                      • {step}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
