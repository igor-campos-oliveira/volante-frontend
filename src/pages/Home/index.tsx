import SearchPage from "@/components/SearchPage";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardAccountsAPI, type ContaDashboardItem } from "@/data/api/AccountsAPI";
import { timestampToLocaleString, USE_QUERY_CONFIGS } from "@/data/constants/utils";
import { currencyFormat } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";
import PieChartWithPaddingAngle from "./PieChartWithPaddingAngle";

const formatMoney = (value: number | null) =>
  value == null ? "-" : currencyFormat(value, "currency");

const formatEnumLabel = (value: string | null) => {
  if (!value) return "-";

  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
};

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR") : "-";

type AccountColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (account: ContaDashboardItem) => ReactNode;
};

const ACCOUNT_COLUMNS: AccountColumn[] = [
  {
    key: "descricao",
    label: "Descricao",
    render: (account) => account.descricao || "-",
  },
  {
    key: "valor",
    label: "Valor",
    align: "right",
    render: (account) => formatMoney(account.valor),
  },
  {
    key: "tipo",
    label: "Tipo",
    render: (account) => formatEnumLabel(account.tipo),
  },
  {
    key: "formaPagamento",
    label: "Forma de pagamento",
    render: (account) => formatEnumLabel(account.formaPagamento),
  },
  {
    key: "parcelas",
    label: "Parcelas",
    align: "right",
    render: (account) => account.parcelas || 1,
  },
  {
    key: "dataPagamento",
    label: "Data de pagamento",
    render: (account) => formatDateTime(account.dataPagamento),
  },
];

const columnTemplate = "md:grid-cols-[2fr_1fr_1fr_1.2fr_0.8fr_1.4fr]";

export default function HomePage() {
  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["dashboard_accounts"],
    queryFn: () => getDashboardAccountsAPI(),
    ...USE_QUERY_CONFIGS,
  });

  const metrics = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        const value = account.valor ?? 0;
        const isPaid = Boolean(account.dataPagamento);

        acc.total += value;
        acc.count += 1;

        if (isPaid) {
          acc.paidTotal += value;
          acc.paidCount += 1;
        } else {
          acc.pendingTotal += value;
          acc.pendingCount += 1;
        }

        return acc;
      },
      {
        total: 0,
        count: 0,
        paidTotal: 0,
        paidCount: 0,
        pendingTotal: 0,
        pendingCount: 0,
      },
    );
  }, [accounts]);

  const lastUpdatedAt = `Ultima atualizacao: ${timestampToLocaleString(dataUpdatedAt)}`;

  return (
    <SearchPage>
      <SearchPage.Title>Inicio</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>

      <section className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`home-metric-skeleton-${index}`} className="h-[92px] w-full rounded-xl" />
          ))}

        {!isLoading && (
          <>
            <MetricCard
              label="Total em contas"
              value={formatMoney(metrics.total)}
              helper={`${metrics.count} ${metrics.count === 1 ? "conta" : "contas"}`}
            />
            <MetricCard
              label="Total pago"
              value={formatMoney(metrics.paidTotal)}
              helper={`${metrics.paidCount} ${metrics.paidCount === 1 ? "conta paga" : "contas pagas"}`}
            />
            <MetricCard
              label="Total pendente"
              value={formatMoney(metrics.pendingTotal)}
              helper={`${metrics.pendingCount} ${
                metrics.pendingCount === 1 ? "conta pendente" : "contas pendentes"
              }`}
            />
            <MetricCard
              label="Ticket medio"
              value={formatMoney(metrics.count > 0 ? metrics.total / metrics.count : 0)}
              helper="Media por conta"
            />
          </>
        )}
      </section>

      <section className="mt-4">
        {isLoading ? (
          <Skeleton className="h-[320px] w-full rounded-xl" />
        ) : (
          <PieChartWithPaddingAngle accounts={accounts} />
        )}
      </section>

      <section className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className={`hidden border-b bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 md:grid ${columnTemplate}`}>
          {ACCOUNT_COLUMNS.map((column) => (
            <span
              key={column.key}
              className={column.align === "right" ? "text-right" : "text-left"}
            >
              {column.label}
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading &&
            Array.from({ length: 8 }).map((_, index) => (
              <div key={`home-accounts-skeleton-${index}`} className="border-b px-4 py-4">
                <Skeleton className="h-[22px] w-full rounded-md" />
              </div>
            ))}

          {!isLoading && accounts.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma conta encontrada para o dashboard.
            </div>
          )}

          {!isLoading &&
            accounts.map((account) => (
              <div key={account.id} className="border-b px-4 py-3 last:border-b-0">
                <div className={`hidden items-center gap-3 md:grid ${columnTemplate}`}>
                  {ACCOUNT_COLUMNS.map((column) => (
                    <span
                      key={`${account.id}-${column.key}`}
                      className={`text-sm text-zinc-700 ${
                        column.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {column.render(account)}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-1 md:hidden">
                  {ACCOUNT_COLUMNS.map((column) => (
                    <p key={`${account.id}-mobile-${column.key}`} className="text-sm text-zinc-700">
                      <span className="font-medium text-zinc-500">{column.label}: </span>
                      {column.render(account)}
                    </p>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </section>

      {isError && (
        <p className="mt-3 text-sm text-red-600">
          {error instanceof Error ? error.message : "Nao foi possivel carregar as contas."}
        </p>
      )}
    </SearchPage>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{helper}</p>
    </article>
  );
}
