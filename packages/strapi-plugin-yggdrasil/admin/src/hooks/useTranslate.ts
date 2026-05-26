import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import getTranslation from '../utils/getTranslation';

export const useTranslate = () => {
  const { formatMessage } = useIntl();
  return useCallback(
    (id: string, values?: Record<string, string | number>) =>
      formatMessage({ id: getTranslation(id), defaultMessage: id }, values),
    [formatMessage],
  );
};
