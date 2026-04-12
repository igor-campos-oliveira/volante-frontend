import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteEmployee,
  Employee,
  getEmployeesAPI,
} from "@/data/api/EmployeesAPI";
import {
  DEBOUNCE_TIMEOUT,
  timestampToLocaleString,
  USE_QUERY_CONFIGS,
} from "@/data/constants/utils";
import useDebounce from "@/hooks/useDebounce";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FileTextIcon, MoreVertical, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import EmployeeUpsertModal from "./EmployeeUpsertModal";

const digitsOnly = (value?: string | null) =>
  String(value ?? "").replace(/\D/g, "");

const formatCPF = (value?: string | null) => {
  const digits = digitsOnly(value);
  if (digits.length !== 11) {
    return value || "CPF nao informado";
  }
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatPhone = (value?: string | null) => {
  const digits = digitsOnly(value);
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return value || "(00) 00000-0000";
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useDebounce({ timeout: DEBOUNCE_TIMEOUT });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const {
    data: employees,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey: ["get_all_employees", { searchValue }],
    queryFn: ({ pageParam = 1 }) => getEmployeesAPI(searchValue, pageParam),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
    initialPageParam: 1,
  });

  const employeesData = employees?.pages.flatMap((page) => page.data) || [];
  const lastUpdatedAt =
    "Ultima atualizacao: " + timestampToLocaleString(dataUpdatedAt);

  const { mutateAsync: handleDeleteEmployee, isPending: isDeleting } = useMutation({
    mutationFn: async (employeeId: string) => deleteEmployee(employeeId),
  });

  const openCreateModal = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const openDeleteConfirm = (employee: Employee) => {
    setEmployeeToDelete(employee);
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) {
      return;
    }
    setEmployeeToDelete(null);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete?.id) {
      toast.error("Funcionario invalido para exclusao.");
      return;
    }

    try {
      await handleDeleteEmployee(employeeToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ["get_all_employees"] });
      toast.success("Funcionario removido.");
      setEmployeeToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel remover o funcionario.";
      toast.error(message);
    }
  };

  return (
    <SearchPage>
      <SearchPage.Title>Funcionarios</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>

      <SearchPage.SearchBar
        placeholder="Pesquise os funcionarios aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
        posChildren={
          <Button variant="theme" onClick={openCreateModal}>
            <Plus size={18} />
            Novo funcionario
          </Button>
        }
      />

      <Card.Container>
        {employeesData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum funcionario encontrado.
          </div>
        )}

        {employeesData.map((employee: Employee) => (
          <Card
            key={employee.id}
            className="break-inside-avoid transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(139,92,246,0.55)]"
          >
            <Card.Header
              title={employee.nome || "Sem nome"}
              description={employee.cargo || "Cargo nao informado"}
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
                      onSelect={() => openEditModal(employee)}
                      className="cursor-pointer"
                    >
                      <Pencil size={16} className="mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isDeleting}
                      onSelect={() => openDeleteConfirm(employee)}
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
                <FileTextIcon size={18} />
                {formatCPF(employee.cpf)}
              </p>
              <p className="mb-1 flex gap-2 text-sm">
                <Phone size={18} />
                {formatPhone(employee.telefone)}
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

      <EmployeeUpsertModal
        open={isModalOpen}
        employee={editingEmployee}
        onOpenChange={(open: boolean) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingEmployee(null);
          }
        }}
      />

      <Dialog
        open={Boolean(employeeToDelete)}
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
              Voce realmente deseja excluir o funcionario{" "}
              <span className="font-medium text-foreground">
                {employeeToDelete?.nome || "selecionado"}
              </span>
              ? Esta acao nao pode ser desfeita e removera o registro
              definitivamente do banco de dados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="transition-colors hover:!bg-violet-100"
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
