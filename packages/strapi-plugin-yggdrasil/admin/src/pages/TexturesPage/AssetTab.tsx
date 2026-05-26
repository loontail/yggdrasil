import { Box, Flex, SearchForm, Searchbar, Typography } from '@strapi/design-system';
import { Images } from '@strapi/icons';
import { memo } from 'react';
import { useTranslate } from '../../hooks/useTranslate';
import type { PlayerCape, PlayerSkin } from '../../types/entities';
import Paginator from './Paginator';
import SkinCard from './SkinCard';

type AssetKind = 'skin' | 'cape';

interface AssetTabProps {
  kind: AssetKind;
  items: ReadonlyArray<PlayerSkin | PlayerCape>;
  total: number;
  page: number;
  pageCount: number;
  loading: boolean;
  search: string;
  serverUrl: string;
  missingIds?: Set<number>;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onSearchSubmit: () => void;
  onPageChange: (pageNumber: number) => void;
  onDeleted: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
}

// Translation keys differ only by `skin`/`cape` suffix. Centralized so the
// rendered tab never has both kinds' strings in the JSX.
const TRANSLATE_KEYS = {
  skin: {
    searchName: 'skin-search',
    searchClear: 'search.clear.skins',
    searchLabel: 'search.label.skins',
    empty: 'empty.skins',
  },
  cape: {
    searchName: 'cape-search',
    searchClear: 'search.clear.capes',
    searchLabel: 'search.label.capes',
    empty: 'empty.capes',
  },
} as const;

const AssetTab = memo(function AssetTab({
  kind,
  items,
  total,
  page,
  pageCount,
  loading,
  search,
  serverUrl,
  missingIds,
  onSearchChange,
  onSearchClear,
  onSearchSubmit,
  onPageChange,
  onDeleted,
  onDelete,
}: AssetTabProps) {
  const translate = useTranslate();
  const keys = TRANSLATE_KEYS[kind];

  return (
    <Box
      style={{
        padding: '28px 56px 48px',
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {(search !== '' || total > 0) && (
        <Box paddingBottom={5} style={{ maxWidth: 440 }}>
          <SearchForm>
            <Searchbar
              name={keys.searchName}
              placeholder={translate('search.placeholder')}
              value={search}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onSearchChange(event.target.value)
              }
              clearLabel={translate(keys.searchClear)}
              onClear={onSearchClear}
              onSubmit={onSearchSubmit}
            >
              {translate(keys.searchLabel)}
            </Searchbar>
          </SearchForm>
        </Box>
      )}

      {loading ? (
        <Flex alignItems="center" justifyContent="center" style={{ flex: 1 }}>
          <Typography textColor="neutral500">{translate('state.loading')}</Typography>
        </Flex>
      ) : items.length === 0 ? (
        <Flex
          alignItems="center"
          justifyContent="center"
          direction="column"
          gap={3}
          style={{ flex: 1 }}
        >
          <Box style={{ color: 'var(--strapi-neutral-400)', lineHeight: 0 }}>
            <Images width={48} height={48} />
          </Box>
          <Typography textColor="neutral400">{translate(keys.empty)}</Typography>
        </Flex>
      ) : (
        <>
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {items.map((item) => (
              <Box key={item.id}>
                <SkinCard
                  entry={item}
                  type={kind}
                  serverUrl={serverUrl}
                  isMissing={missingIds?.has(item.id)}
                  onDeleted={onDeleted}
                  onDelete={onDelete}
                />
              </Box>
            ))}
          </Box>
          <Paginator page={page} pageCount={pageCount} onPageChange={onPageChange} />
        </>
      )}
    </Box>
  );
});

export default AssetTab;
