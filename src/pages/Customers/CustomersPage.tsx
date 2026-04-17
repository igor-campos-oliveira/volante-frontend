import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import { Skeleton } from "@/components/ui/skeleton";
import { getCostomersAPI } from "@/data/api/CustomersAPI";
import {
  DEBOUNCE_TIMEOUT,
  timestampToLocaleString,
  USE_QUERY_CONFIGS,
} from "@/data/constants/utils";
import useDebounce from "@/hooks/useDebounce";
import { isToday, sortByCreatedAtDesc } from "@/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Home, Mail, Phone } from "lucide-react";

export default function CustomersPage() {
  const [searchValue, setSearchValue] = useDebounce({
    timeout: DEBOUNCE_TIMEOUT,
  });

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
    "Última atualização: " + timestampToLocaleString(dataUpdatedAt);

  return (
    <SearchPage>
      <SearchPage.Title>Clientes</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>
      <SearchPage.SearchBar
        placeholder="Pesquise seus clientes aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
      />
      <Card.Container>
        {isLoading &&
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`customers-skeleton-${index}`}
              className="h-[170px] w-full rounded-lg"
            />
          ))}

        {!isLoading && sortedCustomersData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        )}

        {sortedCustomersData.map((customer: any) => (
          <Card key={customer.id}>
            {isToday(new Date(customer.updatedAt)) && <Card.Badge> </Card.Badge>}
            <Card.Header
              fallback={customer?.nome?.substring(0, 1) || "?"}
              title={customer.nome || "Nome não informado"}
              description={
                customer.tipo_documento
                  ? `${customer.tipo_documento.toUpperCase()}: ${customer.numero_documento}`
                  : "Documento não informado"
              }
            ></Card.Header>
            <Card.Content>
              <p className="mb-1 flex gap-2 text-sm">
                <Phone size={18} />
                {customer.telefone || "(00) 00000000"}
              </p>
              <p className="flex gap-2 text-sm">
                <Mail size={18} />
                {customer.email || "não@informado.com"}
              </p>
              <p className="mt-1 flex gap-2 text-sm">
                <Home size={18} />
                {customer.endereco || "não informado"}
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
    </SearchPage>
  );
}
