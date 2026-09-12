import {
  useId,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type DetailsHTMLAttributes,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import type { Tone } from "../tone.ts";
import "./ui.css";

export function Panel({
  title,
  children,
  className,
  ...props
}: PropsWithChildren<{ title: string } & HTMLAttributes<HTMLElement>>) {
  return (
    <section className={["prototype-panel", className].filter(Boolean).join(" ")} aria-label={title} {...props}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export interface TechnicalDetailsProps extends PropsWithChildren<DetailsHTMLAttributes<HTMLDetailsElement>> {
  summary: ReactNode;
}

/** Native disclosure for optional implementation context; keyboard behavior comes from details/summary. */
export function TechnicalDetails({ summary, children, className, ...props }: TechnicalDetailsProps) {
  return (
    <details className={["technical-details", className].filter(Boolean).join(" ")} {...props}>
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}

export function ActionButton({
  children,
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={["prototype-action", className].filter(Boolean).join(" ")} type={type ?? "button"}>
      {children}
    </button>
  );
}



export type SectionProps = {
  title: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
};

export function Section({ title, hint, children }: SectionProps) {
  return (
    <section className="ui-section">
      <header className="ui-section-header">
        <h2 className="ui-section-title">{title}</h2>
        {hint === undefined ? null : <p className="ui-section-hint">{hint}</p>}
      </header>
      <div className="ui-section-content">{children}</div>
    </section>
  );
}

export type NoteProps = {
  children: ReactNode;
  tone?: Tone;
};

export function Note({ children, tone = "neutral" }: NoteProps) {
  return <p className={`ui-note ui-tone-${tone}`}>{children}</p>;
}

export type Row = {
  /** Stable identity for the row; rows render in data order. */
  id: string;
  label: ReactNode;
  value: ReactNode;
  tone?: Tone;
};

export type RowsProps = {
  rows: readonly Row[];
};

export function Rows({ rows }: RowsProps) {
  return (
    <dl className="ui-rows">
      {rows.map((row) => (
        <div className="ui-row" key={row.id}>
          <dt className="ui-row-label">{row.label}</dt>
          <dd className={`ui-row-value${row.tone ? ` ui-tone-${row.tone}` : ""}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type CardProps = {
  title: ReactNode;
  tone?: Tone;
  rows?: readonly Row[];
  children?: ReactNode;
};

export function Card({ title, tone, rows, children }: CardProps) {
  return (
    <article className="ui-card">
      <header className="ui-card-header">
        <h3 className="ui-card-title">{title}</h3>
        {tone === undefined ? null : <Chip tone={tone}>{tone}</Chip>}
      </header>
      {rows === undefined ? null : <Rows rows={rows} />}
      {children === undefined ? null : <div className="ui-card-content">{children}</div>}
    </article>
  );
}

export type CardGridProps = {
  children: ReactNode;
  minCardWidth?: number;
};

export function CardGrid({ children, minCardWidth = 260 }: CardGridProps) {
  return (
    <div className="ui-card-grid" style={{ "--ui-card-min-width": `${minCardWidth}px` } as CSSProperties}>
      {children}
    </div>
  );
}

export type BulletItem = {
  /** Stable identity for the bullet; items render in data order. */
  id: string;
  content: ReactNode;
};

export type BulletsProps = {
  items: readonly BulletItem[];
};

export function Bullets({ items }: BulletsProps) {
  return (
    <ul className="ui-bullets">
      {items.map((item) => <li key={item.id}>{item.content}</li>)}
    </ul>
  );
}

export type DataTableColumn = {
  key: string;
  label: ReactNode;
};

export type DataTableRow = {
  /** Stable identity for the row; rows render in data order. */
  id: string;
  cells: Record<string, ReactNode>;
};

export type DataTableProps = {
  columns: readonly DataTableColumn[];
  rows: readonly DataTableRow[];
  caption?: ReactNode;
};

export function DataTable({ columns, rows, caption }: DataTableProps) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        {caption === undefined ? null : <caption>{caption}</caption>}
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>{columns.map((column) => <td key={column.key}>{row.cells[column.key]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type ChipProps = {
  tone?: Tone;
  children: ReactNode;
};

export function Chip({ tone = "neutral", children }: ChipProps) {
  return <span className={`ui-chip ui-tone-${tone}`}>{children}</span>;
}

export type MonoProps = {
  children: ReactNode;
};

export function Mono({ children }: MonoProps) {
  return <code className="ui-mono">{children}</code>;
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  variant?: ButtonVariant;
  pressed?: boolean;
};

export function Button({ variant = "secondary", pressed, className, type = "button", ...buttonProps }: ButtonProps) {
  const classes = ["prototype-action", `prototype-action--${variant}`, className].filter(Boolean).join(" ");
  return <button {...buttonProps} type={type} className={classes} aria-pressed={pressed === undefined ? undefined : pressed} />;
}

export type ToolbarProps = {
  children: ReactNode;
};

export function Toolbar({ children }: ToolbarProps) {
  return <div className="ui-toolbar">{children}</div>;
}

export type SegmentedOption = {
  value: string;
  label: ReactNode;
};

export type SegmentedControlProps = {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  label: ReactNode;
};

export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
  const name = useId();
  return (
    <fieldset className="ui-segmented">
      <legend className="ui-segmented-legend">{label}</legend>
      {options.map((option) => (
        <label
          className={`ui-segmented-option${option.value === value ? " ui-segmented-option-selected" : ""}`}
          key={option.value}
        >
          <input
            className="ui-segmented-input"
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span className="ui-segmented-option-label">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
