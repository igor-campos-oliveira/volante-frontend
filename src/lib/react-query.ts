import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient()

export interface QueryClientCacheSnapshot {
  queryCountBefore: number;
  mutationCountBefore: number;
  queryCountAfter: number;
  mutationCountAfter: number;
}

export const clearQueryClientCache = async (
  client: QueryClient,
): Promise<QueryClientCacheSnapshot> => {
  const queryCountBefore = client.getQueryCache().getAll().length;
  const mutationCountBefore = client.getMutationCache().getAll().length;

  await client.cancelQueries();
  client.clear();

  return {
    queryCountBefore,
    mutationCountBefore,
    queryCountAfter: client.getQueryCache().getAll().length,
    mutationCountAfter: client.getMutationCache().getAll().length,
  };
};
