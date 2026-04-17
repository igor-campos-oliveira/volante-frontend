import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Costumer,
  deleteCostumer,
  getCostomersAPI,
} from "@/data/api/CustomersAPI";
import {
  DEBOUNCE_TIMEOUT,
  SO_STATUS_LIST,
  timestampToLocaleString,
  USE_QUERY_CONFIGS,
} from "@/data/constants/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useDebounce from "@/hooks/useDebounce";
import { isToday, sortByCreatedAtDesc } from "@/lib/utils";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Car,
  ClipboardList,
  Home,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ServiceOrderAPI from "@/data/api/ServiceOrderAPI";
import { ServiceOrder } from "@/pages/ServiceOrder/types";
import { ROUTER_PATHS } from "@/routes/routes";
import { useServiceOrderStore } from "@/hooks/useServiceOrder";
import CustomerUpsertModal from "./CustomerUpsertModal";

export default function CustomersPage() {
  const navigate = useNavigate();
  const { setServiceOrder } = useServiceOrderStore();
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useDebounce({
    timeout: DEBOUNCE_TIMEOUT,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Costumer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Costumer | null>(null);
  const [customerToViewBudgets, setCustomerToViewBudgets] =
    useState<Costumer | null>(null);

  const {
    data: customers,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
    dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey: ["get_customers", { searchValue }],
    queryFn: ({ pageParam = 1 }) => getCostomersAPI(searchValue, pageParam),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
  });

  const customersData = customers?.pages.flatMap((page) => page.data) || [];
  const sortedCustomersData = sortByCreatedAtDesc(customersData);
  const lastUpdatedAt =
    "Ultima atualizacao: " + timestampToLocaleString(dataUpdatedAt);
  const getStatusOption = (status?: string | null) =>
    SO_STATUS_LIST.find((item) => item.value === status);

  const {
    data: customerBudgets = [],
    isLoading: isLoadingBudgets,
    isFetching: isFetchingBudgets,
  } = useQuery({
    queryKey: ["get_customer_budgets", customerToViewBudgets?.id],
    queryFn: () => ServiceOrderAPI.getByCustomerId(customerToViewBudgets?.id as string),
    enabled: Boolean(customerToViewBudgets?.id),
  });
  const sortedCustomerBudgets = sortByCreatedAtDesc(customerBudgets);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Costumer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const { mutateAsync: handleDeleteCustomer, isPending: isDeleting } =
    useMutation({
      mutationFn: async (customerId: string) => deleteCostumer(customerId),
    });

  const openDeleteConfirm = (customer: Costumer) => {
    setCustomerToDelete(customer);
  };

  const openBudgetsModal = (customer: Costumer) => {
    setCustomerToViewBudgets(customer);
  };

  const closeBudgetsModal = () => {
    setCustomerToViewBudgets(null);
  };

  const openBudget = async (serviceOrder: ServiceOrder) => {
    await setServiceOrder({ ...serviceOrder });
    closeBudgetsModal();
    navigate(`${ROUTER_PATHS.SERVICE_ORDER}/${serviceOrder.uuid || serviceOrder.id}`, {
      state: { service_order: serviceOrder },
    });
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) {
      return;
    }
    setCustomerToDelete(null);
  };

  const confirmDelete = async () => {
    if (!customerToDelete?.id) {
      toast.error("Cliente invalido para exclusao.");
      return;
    }

    try {
      await handleDeleteCustomer(customerToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ["get_customers"] });
      toast.success("Cliente removido.");
      setCustomerToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel remover o cliente.";
      toast.error(message);
    }
  };

  return (
    <SearchPage>
      <SearchPage.Title>Clientes</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>
      <SearchPage.SearchBar
        placeholder="Pesquise seus clientes aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
        posChildren={
          <Button variant="theme" className="h-[50px]" onClick={openCreateModal}>
            <Plus size={18} />
            Novo cliente
          </Button>
        }
      />
      <Card.Container>
        {isLoading &&
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`customers-modal-skeleton-${index}`}
              className="h-[190px] w-full rounded-lg"
            />
          ))}

        {!isLoading && sortedCustomersData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        )}
        {sortedCustomersData.map((customer: Costumer) => (
          <Card
            key={customer.id}
            onClick={() => openBudgetsModal(customer)}
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(139,92,246,0.55)]"
          >
            {isToday(new Date(customer.updatedAt as string)) && (
              <Card.Badge> </Card.Badge>
            )}
            <Card.Header
              fallback={customer?.nome?.substring(0, 1) || "?"}
              title={customer.nome || "Nome nao informado"}
              description={
                customer.tipo_documento
                  ? `${customer.tipo_documento.toUpperCase()}: ${customer.numero_documento}`
                  : "Documento nao informado"
              }
            >
              <Card.HeaderActions>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Card.Action
                      aria-label="Mais opcoes"
                      icon={<MoreVertical size={18} />}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onSelect={() => openEditModal(customer)}
                      className="cursor-pointer"
                    >
                      <Pencil size={16} className="mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isDeleting}
                      onSelect={() => {
                        openDeleteConfirm(customer);
                      }}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Deletar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card.HeaderActions>
            </Card.Header>
            <Card.Content>
              <p className="mb-1 flex gap-2 text-sm">
                <Phone size={18} />
                {customer.telefone || "(00) 00000000"}
              </p>
              <p className="flex gap-2 text-sm">
                <Mail size={18} />
                {customer.email || "nao@informado.com"}
              </p>
              <p className="mt-1 flex gap-2 text-sm">
                <Home size={18} />
                {customer.endereco || "nao informado"}
              </p>
            </Card.Content>
          </Card>
        ))}
      </Card.Container>
      <SearchPage.LoadMore
        visible={hasNextPage}
        loading={isFetchingNextPage}
        onClick={() => fetchNextPage()}
      >
        Ver mais
      </SearchPage.LoadMore>
      <CustomerUpsertModal
        open={isModalOpen}
        customer={editingCustomer}
        onOpenChange={(open: boolean) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingCustomer(null);
          }
        }}
      />
      <Dialog
        open={Boolean(customerToViewBudgets)}
        onOpenChange={(open) => {
          if (!open) {
            closeBudgetsModal();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              OrÃ§amentos de {customerToViewBudgets?.nome || "cliente"}
            </DialogTitle>
            <DialogDescription>
              Lista de orcamentos relacionados ao cliente selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
            {(isLoadingBudgets || isFetchingBudgets) &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={`customer-budgets-skeleton-${index}`}
                  className="h-[84px] w-full rounded-lg"
                />
              ))}

            {!isLoadingBudgets && !isFetchingBudgets && customerBudgets.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nenhum orcamento encontrado para este cliente.
              </div>
            )}

            {!isLoadingBudgets &&
              !isFetchingBudgets &&
              sortedCustomerBudgets.map((serviceOrder) => {
                const statusOption = getStatusOption(serviceOrder.status);

                return (
                  <button
                    key={serviceOrder.uuid || serviceOrder.id}
                    type="button"
                    onClick={() => openBudget(serviceOrder as ServiceOrder)}
                    className="w-full rounded-lg border p-3 text-left transition hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        Orcamento #{serviceOrder.uuid || serviceOrder.id}
                      </p>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusOption
                          ? `${statusOption.color} text-white`
                          : "bg-muted text-muted-foreground"}`}
                      >
                        {statusOption?.label ||
                          serviceOrder.status?.replace(/_/g, " ") ||
                          "sem status"}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <p className="flex items-center gap-1">
                        <Car size={14} />
                        {serviceOrder?.vehicle?.brand || serviceOrder?.vehicle?.model
                          ? `${serviceOrder?.vehicle?.brand || ""} ${serviceOrder?.vehicle?.model || ""}`.trim()
                          : "Veiculo nao informado"}
                      </p>
                      <p className="flex items-center gap-1">
                        <ClipboardList size={14} />
                        Placa: {serviceOrder?.vehicle?.plate || "nao informada"}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeBudgetsModal}
              className="transition-colors hover:border-black hover:bg-black hover:text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(customerToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteConfirm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
            <DialogDescription>
              Voce realmente deseja excluir o cliente{" "}
              <span className="font-medium text-foreground">
                {customerToDelete?.nome || "selecionado"}
              </span>
              ? Esta acao nao pode ser desfeita e removera o registro
              definitivamente do banco de dados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              loading={isDeleting}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SearchPage>
  );
}
