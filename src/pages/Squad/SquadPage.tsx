import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import { Skeleton } from "@/components/ui/skeleton";
import { getSquadAPI } from "@/data/api/SquadAPI";
import { USE_QUERY_CONFIGS } from "@/data/constants/utils";
import useDebounce from "@/hooks/useDebounce";
import { isToday, sortByCreatedAtDesc } from "@/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";

export default function SquadPage() {
  const [searchValue, setSearchValue] = useDebounce({ timeout: 800 });

  const {
    data: squad,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["get_squad", { searchValue }],
    queryFn: ({ pageParam = 1 }) => getSquadAPI(searchValue, pageParam),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
  });
  const squadData = squad?.pages.flatMap((page) => page.data) || [];
  const sortedSquadData = sortByCreatedAtDesc(squadData);

  return (
    <SearchPage>
      <SearchPage.Title>Equipe</SearchPage.Title>
      <SearchPage.SearchBar
        placeholder="Pesquise os membros da sua equipe aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
      />
      <Card.Container>
        {isLoading &&
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`squad-skeleton-${index}`}
              className="h-[110px] w-full rounded-lg"
            />
          ))}

        {!isLoading && sortedSquadData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum membro encontrado.
          </div>
        )}

        {sortedSquadData.map((squadMember: any) => (
          <Card className="min-h-[110px]" key={squadMember.id}>
            {isToday(new Date(squadMember.createdAt)) && <Card.Badge>Novo</Card.Badge>}
            <Card.Header
              fallback={squadMember?.name?.substring(0, 1)}
              title={squadMember.name}
              description={
                squadMember.cpf || squadMember.phone || squadMember.email
              }
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
        onClick={fetchNextPage}
      >
        Ver mais
      </SearchPage.LoadMore>
    </SearchPage>
  );
}
