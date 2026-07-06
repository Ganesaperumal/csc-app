export const isJobClosed = (job: any): boolean => {
  if (!job) return false;

  const erpStatus = (job.erp_status || '').toLowerCase();
  const goodsStatus = (job.goods_track_status || '').toLowerCase();
  const carStatus = (job.car_track_status || '').toLowerCase();

  // 1. ERP Status check (Canceled / Cancelled)
  if (erpStatus.includes('cancel')) {
    return true;
  }

  // 2. Specific closed track statuses
  const closedStatuses = [
    '22. job completed',
    '23. job # taken for billing',
    '24. customer cancelled',
    '25. job # to be cancelled'
  ];

  const hasClosedStatus = (status: string) => {
    return closedStatuses.some(cs => status.includes(cs));
  };

  if (hasClosedStatus(goodsStatus) || hasClosedStatus(carStatus)) {
    return true;
  }

  // 3. ERP status is Billed AND Goods Track Status is "Job Completed" (or contains "job completed")
  if (erpStatus === 'billed' && goodsStatus.includes('job completed')) {
    return true;
  }

  return false;
};
