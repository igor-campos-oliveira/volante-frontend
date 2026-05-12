import SearchPage from "@/components/SearchPage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SelectOption from "@/components/ui/selectOptions";
import ConfirmButton from "@/components/ConfirmButton/ConfirmButton";
import {
  createAccountAPI,
  deleteAccountAPI,
  getAccountAmount,
  getCurrentMonthKey,
  getDashboardMonthOptions,
  getMonthlyFinancialDataAPI,
  isAccountPaid,
  isIncomeAccount,
  updateAccountAPI,
  type AccountCreatePayload,
  type ContaDashboardItem,
} from "@/data/api/AccountsAPI";
import { timestampToLocaleString, USE_QUERY_CONFIGS } from "@/data/constants/utils";
import { currencyFormat } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, DollarSign, Landmark, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import AddAccountDialog from "./AddAccountDialog";
import FinancialBarChart from "./FinancialBarChart";
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
  cellClassName?: string;
  headerClassName?: string;
  render: (account: ContaDashboardItem) => ReactNode;
};

const ACCOUNT_COLUMNS: AccountColumn[] = [
  {
    key: "descricao",
    label: "Descricao",
    cellClassName: "truncate pr-2",
    headerClassName: "pr-2",
    render: (account) => account.descricao || "-",
  },
  {
    key: "categoria",
    label: "Categoria",
    cellClassName: "whitespace-nowrap",
    headerClassName: "whitespace-nowrap",
    render: (account) => formatEnumLabel(account.categoria),
  },
  {
    key: "valor",
    label: "Valor",
    align: "right",
    cellClassName: "whitespace-nowrap tabular-nums",
    headerClassName: "whitespace-nowrap",
    render: (account) => (
      <span className={account.movimentacao === "despesa" ? "text-red-600" : ""}>
        {formatMoney(account.valor)}
      </span>
    ),
  },
  {
    key: "tipo",
    label: "Tipo",
    cellClassName: "whitespace-nowrap",
    headerClassName: "whitespace-nowrap",
    render: (account) => formatEnumLabel(account.tipo),
  },
  {
    key: "movimentacao",
    label: "Movimentacao",
    cellClassName: "whitespace-nowrap",
    headerClassName: "whitespace-nowrap",
    render: (account) => (
      <span className={account.movimentacao === "despesa" ? "font-medium text-red-600" : "font-medium"}>
        {formatEnumLabel(account.movimentacao)}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    cellClassName: "whitespace-nowrap",
    headerClassName: "whitespace-nowrap",
    render: (account) => (
      <span className={account.status === "pago" ? "font-semibold text-emerald-700" : ""}>
        {formatEnumLabel(account.status)}
      </span>
    ),
  },
  {
    key: "formaPagamento",
    label: "Forma de pagamento",
    cellClassName: "whitespace-nowrap",
    headerClassName: "whitespace-nowrap",
    render: (account) => formatEnumLabel(account.formaPagamento),
  },
  {
    key: "parcelas",
    label: "Parcelas",
    align: "right",
    cellClassName: "whitespace-nowrap tabular-nums",
    headerClassName: "whitespace-nowrap",
    render: (account) => account.parcelas || 1,
  },
  {
    key: "parcelaAtual",
    label: "Parcela atual",
    align: "right",
    cellClassName: "whitespace-nowrap",
    headerClassName: "whitespace-nowrap",
    render: (account) => account.parcelaAtual ?? "-",
  },
  {
    key: "dataPagamento",
    label: "Data de pagamento",
    cellClassName: "whitespace-nowrap",
    headerClassName: "whitespace-nowrap",
    render: (account) => formatDateTime(account.dataPagamento),
  },
];

const columnTemplate = "md:grid-cols-[1.7fr_1fr_1fr_1fr_1fr_1fr_1.1fr_0.9fr_1fr_1.2fr_0.9fr]";

const monthOptions = getDashboardMonthOptions(18);

export default function HomePage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ContaDashboardItem | null>(null);

  const {
    data: monthlyData,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["dashboard_financial", selectedMonth],
    queryFn: () => getMonthlyFinancialDataAPI(selectedMonth),
    ...USE_QUERY_CONFIGS,
  });

  const { mutateAsync: handleCreateAccount, isPending: isCreatingAccount } = useMutation({
    mutationFn: async (payload: AccountCreatePayload) => createAccountAPI(payload),
  });
  const { mutateAsync: handleUpdateAccount, isPending: isUpdatingAccount } = useMutation({
    mutationFn: async ({
      accountId,
      payload,
    }: {
      accountId: number;
      payload: AccountCreatePayload;
    }) => updateAccountAPI(accountId, payload),
  });
  const { mutateAsync: handleDeleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: async (accountId: number) => deleteAccountAPI(accountId),
  });

  const accounts = monthlyData?.accounts ?? [];

  const metrics = useMemo(() => {
    const paidAccounts = accounts.filter(isAccountPaid);

    const accountRevenue = paidAccounts
      .filter((account) => isIncomeAccount(account))
      .reduce((acc, account) => acc + getAccountAmount(account), 0);

    const accountExpenses = paidAccounts
      .filter((account) => !isIncomeAccount(account))
      .reduce((acc, account) => acc + getAccountAmount(account), 0);

    const serviceRevenue = monthlyData?.serviceRevenue ?? 0;
    const deliveredOrdersRevenue = monthlyData?.deliveredOrdersRevenue ?? 0;
    const deliveredOrdersCount = monthlyData?.deliveredOrdersCount ?? 0;
    const serviceCosts = monthlyData?.serviceItemsCost ?? 0;

    const faturamento = accountRevenue + deliveredOrdersRevenue;
    const custo = accountExpenses + serviceCosts;
    const lucro = faturamento - custo;

    return {
      faturamento,
      custo,
      lucro,
      accountRevenue,
      accountExpenses,
      serviceRevenue,
      deliveredOrdersRevenue,
      deliveredOrdersCount,
      serviceCosts,
      serviceOrdersCount: monthlyData?.serviceOrdersCount ?? 0,
      executedPaymentsCount: monthlyData?.executedPaymentsCount ?? 0,
      accountsPaidCount: monthlyData?.accountsPaidCount ?? 0,
      accountsPendingCount: monthlyData?.accountsPendingCount ?? 0,
    };
  }, [accounts, monthlyData]);

  const pieAccounts = useMemo(() => {
    const expenseAccounts = accounts.filter((account) => isAccountPaid(account) && !isIncomeAccount(account));

    if ((monthlyData?.serviceItemsCost ?? 0) <= 0) {
      return expenseAccounts;
    }

    return [
      ...expenseAccounts,
      {
        id: -1,
        descricao: "Custos de servicos",
        valor: monthlyData?.serviceItemsCost ?? 0,
        tipo: "saida",
        movimentacao: "despesa",
        empresaId: "",
        dataPagamento: `${selectedMonth}-01T00:00:00.000Z`,
        parcelas: 1,
        formaPagamento: null,
        categoria: "servico",
        status: "pago",
        parcelado: false,
        parcelaAtual: null,
      },
    ];
  }, [accounts, monthlyData?.serviceItemsCost, selectedMonth]);

  const barData = useMemo(
    () => [
      { label: "Gastos", value: metrics.custo, unit: "currency" as const },
      { label: "Ganhos", value: metrics.faturamento, unit: "currency" as const },
      { label: "Lucro", value: Math.max(metrics.lucro, 0), unit: "currency" as const },
      {
        label: "Orcamentos feitos",
        value: metrics.serviceOrdersCount,
        unit: "count" as const,
      },
      {
        label: "Pagamentos executados",
        value: metrics.executedPaymentsCount,
        unit: "count" as const,
      },
      {
        label: "Contas pendentes",
        value: metrics.accountsPendingCount,
        unit: "count" as const,
      },
    ],
    [metrics],
  );

  const handleAddAccount = async (payload: AccountCreatePayload) => {
    try {
      if (editingAccount) {
        await handleUpdateAccount({ accountId: editingAccount.id, payload });
      } else {
        await handleCreateAccount(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["dashboard_financial"] });
      toast.success(editingAccount ? "Conta atualizada com sucesso." : "Conta adicionada com sucesso.");
      setEditingAccount(null);
      setIsAddDialogOpen(false);
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : editingAccount
            ? "Nao foi possivel atualizar a conta."
            : "Nao foi possivel adicionar a conta.";
      toast.error(message);
      throw mutationError;
    }
  };

  const onEditAccount = (account: ContaDashboardItem) => {
    setEditingAccount(account);
    setIsAddDialogOpen(true);
  };

  const onDeleteAccount = async (account: ContaDashboardItem) => {
    try {
      await handleDeleteAccount(account.id);
      await queryClient.invalidateQueries({ queryKey: ["dashboard_financial"] });
      toast.success("Conta removida.");
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Nao foi possivel excluir a conta.";
      toast.error(message);
    }
  };

  const lastUpdatedAt = `Ultima atualizacao: ${timestampToLocaleString(dataUpdatedAt)}`;

  return (
    <SearchPage>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchPage.Title>Inicio</SearchPage.Title>
        <div className="flex items-center gap-2">
          <SelectOption
            value={selectedMonth}
            onChange={(value) => setSelectedMonth(String(value))}
            options={monthOptions}
            className="h-10 min-w-[180px]"
          />
          <Button
            variant="theme"
            className="h-10"
            onClick={() => {
              setEditingAccount(null);
              setIsAddDialogOpen(true);
            }}
          >
            <Plus size={16} />
            Adicionar
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>

      <section className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`home-metric-skeleton-${index}`} className="h-[100px] w-full rounded-xl" />
          ))}

        {!isLoading && (
          <>
            <MetricCard
              icon={<CircleDollarSign size={16} />}
              label="Faturamento"
              value={formatMoney(metrics.faturamento)}
              helper={`${metrics.deliveredOrdersCount} orcamento(s) entregue(s) em ${
                monthOptions.find((month) => month.value === selectedMonth)?.label || ""
              }`}
            />
            <MetricCard
              icon={<Wallet size={16} />}
              label="Custo"
              value={formatMoney(metrics.custo)}
              helper="Contas + custos dos servicos"
            />
            <MetricCard
              icon={<Landmark size={16} />}
              label="Lucro"
              value={formatMoney(metrics.lucro)}
              helper="Faturamento - custos"
              emphasis={metrics.lucro >= 0 ? "positive" : "negative"}
            />
            <MetricCard
              icon={<DollarSign size={16} />}
              label="Pagamentos"
              value={`${metrics.executedPaymentsCount}`}
              helper="Pagamentos executados no mes"
            />
          </>
        )}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-2 xl:grid-cols-2">
        {isLoading ? (
          <>
            <Skeleton className="h-[320px] w-full rounded-xl" />
            <Skeleton className="h-[320px] w-full rounded-xl" />
          </>
        ) : (
          <>
            <FinancialBarChart data={barData} />
            <PieChartWithPaddingAngle accounts={pieAccounts} />
          </>
        )}
      </section>

      <section className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div
          className={`hidden border-b bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 md:grid ${columnTemplate}`}
        >
          {ACCOUNT_COLUMNS.map((column) => (
            <span
              key={column.key}
              className={`whitespace-nowrap ${column.align === "right" ? "text-right" : "text-left"} ${
                column.headerClassName || ""
              }`}
            >
              {column.label}
            </span>
          ))}
          <span className="text-right">Acoes</span>
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
              Nenhuma conta encontrada para o mes selecionado.
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
                      } ${column.cellClassName || ""}`}
                    >
                      {column.render(account)}
                    </span>
                  ))}
                  <span className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditAccount(account)}
                      aria-label="Editar conta"
                    >
                      <Pencil size={16} />
                    </Button>
                    <ConfirmButton
                      title="Excluir conta"
                      message="Deseja excluir esta conta?"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      disabled={isDeletingAccount}
                      onConfirm={() => onDeleteAccount(account)}
                    >
                      <Trash2 size={16} />
                    </ConfirmButton>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1 md:hidden">
                  {ACCOUNT_COLUMNS.map((column) => (
                    <p key={`${account.id}-mobile-${column.key}`} className="text-sm text-zinc-700">
                      <span className="font-medium text-zinc-500">{column.label}: </span>
                      {column.render(account)}
                    </p>
                  ))}
                  <div className="mt-1 flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditAccount(account)}
                      aria-label="Editar conta"
                    >
                      <Pencil size={16} />
                    </Button>
                    <ConfirmButton
                      title="Excluir conta"
                      message="Deseja excluir esta conta?"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      disabled={isDeletingAccount}
                      onConfirm={() => onDeleteAccount(account)}
                    >
                      <Trash2 size={16} />
                    </ConfirmButton>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {isError && (
        <p className="mt-3 text-sm text-red-600">
          {error instanceof Error ? error.message : "Nao foi possivel carregar o dashboard financeiro."}
        </p>
      )}

      <AddAccountDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingAccount(null);
          }
        }}
        onSubmit={handleAddAccount}
        loading={isCreatingAccount || isUpdatingAccount}
        mode={editingAccount ? "edit" : "create"}
        account={editingAccount}
      />
    </SearchPage>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  emphasis = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  emphasis?: "neutral" | "positive" | "negative";
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {icon}
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-semibold ${
          emphasis === "positive"
            ? "text-emerald-700"
            : emphasis === "negative"
              ? "text-red-700"
              : "text-zinc-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{helper}</p>
    </article>
  );
}
