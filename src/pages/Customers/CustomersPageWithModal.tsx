import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import { Button } from "@/components/ui/button";
import {
  Costumer,
  deleteCostumer,
  getCostomersAPI,
} from "@/data/api/CustomersAPI";
import {
  DEBOUNCE_TIMEOUT,
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
import { isToday } from "@/lib/utils";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Home,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@heroui/react";
import { toast } from "sonner";
import CustomerUpsertModal from "./CustomerUpsertModal";

export function Grid() {
  return (
    <div className="grid w-full max-w-xl grid-cols-3 gap-4">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useDebounce({
    timeout: DEBOUNCE_TIMEOUT,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Costumer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Costumer | null>(null);

  const {
    data: customers,
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
  const lastUpdatedAt =
    "Ultima atualizacao: " + timestampToLocaleString(dataUpdatedAt);

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
          <Button variant="theme" onClick={openCreateModal}>
            <Plus size={18} />
            Novo cliente
          </Button>
        }
      />
      <Card.Container>
        {customersData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        )}
        {customersData.map((customer: Costumer) => (
          <Card key={customer.id}>
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
