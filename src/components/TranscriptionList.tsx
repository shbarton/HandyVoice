interface Transcription {
  id: string;
  text: string;
  date: string;
}

interface TranscriptionListProps {
  transcriptions: Transcription[];
}

export function TranscriptionList({ transcriptions }: TranscriptionListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Recent Transcriptions
        </h2>
        <button className="text-sm font-medium text-accent hover:text-accent/80 transition-colors uppercase tracking-wider">
          View All
        </button>
      </div>
      <div className="flow-root">
        <ul className="divide-y divide-border/40">
          {transcriptions.map((item, index) => (
            <li
              key={item.id}
              className="group flex items-baseline justify-between py-6 transition-colors hover:bg-white/50 px-4 -mx-4 rounded-xl cursor-pointer"
              style={{ animationDelay: `${index * 50 + 300}ms` }}
            >
              <p className="text-foreground text-lg leading-relaxed font-serif pr-12 line-clamp-2 group-hover:text-primary transition-colors">
                {item.text}
              </p>
              <p className="text-xs font-medium font-sans text-muted-foreground whitespace-nowrap bg-secondary/50 px-3 py-1 rounded-full">
                {item.date}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
