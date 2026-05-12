import Stack from "@mui/material/Stack";
import { PieChart } from "@mui/x-charts/PieChart";
import type { ContaDashboardItem } from "@/data/api/AccountsAPI";
import { useMemo } from "react";

type PieChartWithPaddingAngleProps = {
  accounts: ContaDashboardItem[];
};

const GROUPED_OTHERS_LABEL = "Outros";
const MAX_SLICES = 8;

const chartColors = [
  "#0f766e",
  "#16a34a",
  "#ca8a04",
  "#ea580c",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#52525b",
];

type PieDatum = {
  id: number;
  value: number;
  label: string;
};

const normalizeDescription = (value: string | null) => {
  const normalized = value?.trim();
  return normalized || "Sem descricao";
};

const aggregateExpenseData = (accounts: ContaDashboardItem[]): PieDatum[] => {
  const groupedByDescription = new Map<string, number>();

  accounts.forEach((account) => {
    const value = Number(account.valor ?? 0);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    const description = normalizeDescription(account.descricao);
    groupedByDescription.set(description, (groupedByDescription.get(description) ?? 0) + value);
  });

  const sortedEntries = Array.from(groupedByDescription.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (sortedEntries.length <= MAX_SLICES) {
    return sortedEntries.map((entry, index) => ({
      id: index,
      value: Number(entry.value.toFixed(2)),
      label: entry.label,
    }));
  }

  const topEntries = sortedEntries.slice(0, MAX_SLICES - 1);
  const otherTotal = sortedEntries
    .slice(MAX_SLICES - 1)
    .reduce((acc, entry) => acc + entry.value, 0);

  return [
    ...topEntries.map((entry, index) => ({
      id: index,
      value: Number(entry.value.toFixed(2)),
      label: entry.label,
    })),
    {
      id: MAX_SLICES,
      value: Number(otherTotal.toFixed(2)),
      label: GROUPED_OTHERS_LABEL,
    },
  ];
};

export default function PieChartWithPaddingAngle({ accounts }: PieChartWithPaddingAngleProps) {
  const data = useMemo(() => aggregateExpenseData(accounts), [accounts]);

  const total = useMemo(
    () => data.reduce((acc, item) => acc + item.value, 0),
    [data],
  );

  if (data.length === 0 || total <= 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
        Sem gastos para exibir no grafico.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        Percentual dos gastos
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Passe o mouse nas fatias para ver o nome de cada gasto.
      </p>

      <Stack direction="row" sx={{ width: "100%", height: 260 }}>
        <PieChart
          colors={chartColors}
          series={[
            {
              paddingAngle: 5,
              innerRadius: "60%",
              outerRadius: "90%",
              cornerRadius: 6,
              arcLabel: (item) => `${((item.value / total) * 100).toFixed(1)}%`,
              arcLabelMinAngle: 15,
              data,
            },
          ]}
          slotProps={{ tooltip: { trigger: "item" } }}
          hideLegend
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        />
      </Stack>
    </div>
  );
}
