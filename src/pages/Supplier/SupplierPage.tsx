import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupplierAPI } from "@/data/api/SupplierAPI";
import { USE_QUERY_CONFIGS } from "@/data/constants/utils";
import useDebounce from "@/hooks/useDebounce";
import { isToday, sortByCreatedAtDesc } from "@/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";

export default function SupplierPage() {
  const [searchValue, setSearchValue] = useDebounce({ timeout: 800 });

  const {
    data: squad,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["get_supplier", { searchValue }],
    queryFn: ({ pageParam = 1 }) => getSupplierAPI(searchValue, pageParam),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
  });
  const supplierData = squad?.pages.flatMap((page) => page.data) || [];
  const sortedSupplierData = sortByCreatedAtDesc(supplierData);

  return (
    <SearchPage>
      <SearchPage.Title>Meus Fornecedores</SearchPage.Title>
      <SearchPage.SearchBar
        placeholder="Pesquise os fornecedores aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
      />
      <Card.Container>
        {isLoading &&
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`supplier-skeleton-${index}`}
              className="h-[110px] w-full rounded-lg"
            />
          ))}

        {!isLoading && sortedSupplierData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum fornecedor encontrado.
          </div>
        )}

        {sortedSupplierData.map((supplier: any) => (
          <Card className="min-h-[110px]" key={supplier.id}>
            {isToday(new Date(supplier.createdAt)) && <Card.Badge>Novo</Card.Badge>}
            <Card.Header
              fallback={supplier?.name?.substring(0, 1)}
              title={supplier.name}
              description={supplier.cnpj || supplier.phone || supplier.email}
            >
              <Card.HeaderActions>
                <Card.Action icon={<Mail size={18} />} />
                <Card.Action icon={<Phone size={18} />} />
              </Card.HeaderActions>
            </Card.Header>
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
