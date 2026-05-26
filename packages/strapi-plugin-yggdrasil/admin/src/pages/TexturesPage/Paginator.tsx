import { Button, Flex, Typography } from '@strapi/design-system';
import { ArrowLeft, ArrowRight } from '@strapi/icons';
import { memo } from 'react';
import { useTranslate } from '../../hooks/useTranslate';

const buildPageRange = (currentPage: number, pageCount: number): (number | '…')[] => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const items: (number | '…')[] = [];
  const addPage = (pageNumber: number) => {
    if (!items.includes(pageNumber)) items.push(pageNumber);
  };
  addPage(1);
  if (currentPage > 3) items.push('…');
  for (
    let pageNumber = Math.max(2, currentPage - 1);
    pageNumber <= Math.min(pageCount - 1, currentPage + 1);
    pageNumber++
  ) {
    addPage(pageNumber);
  }
  if (currentPage < pageCount - 2) items.push('…');
  addPage(pageCount);
  return items;
};

interface PaginatorProps {
  page: number;
  pageCount: number;
  onPageChange: (pageNumber: number) => void;
}

const Paginator = memo(function Paginator({ page, pageCount, onPageChange }: PaginatorProps) {
  const translate = useTranslate();

  if (pageCount <= 1) return null;

  const items = buildPageRange(page, pageCount);

  return (
    <Flex gap={1} paddingTop={6} justifyContent="center" alignItems="center">
      <Button
        variant="ghost"
        startIcon={<ArrowLeft />}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {translate('button.prev')}
      </Button>

      {items.map((item, index) =>
        item === '…' ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: separator slots are positional and never reorder
          <Typography key={`dots-${index}`} textColor="neutral500" style={{ padding: '0 4px' }}>
            …
          </Typography>
        ) : (
          <Button
            key={item}
            variant={item === page ? 'default' : 'ghost'}
            onClick={() => onPageChange(item as number)}
            style={{ minWidth: 36, padding: '0 8px' }}
          >
            {item}
          </Button>
        ),
      )}

      <Button
        variant="ghost"
        endIcon={<ArrowRight />}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        {translate('button.next')}
      </Button>
    </Flex>
  );
});

export default Paginator;
