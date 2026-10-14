import { memo } from 'react';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { EmailLink, PhoneLink } from '../leads/ContactLinks';
import LeadActions from '../leads/LeadActions';
import PriorityChip from '../leads/PriorityChip';
import StatusChip from '../leads/StatusChip';

function LeadTableRow({ lead, onEdit, onDelete }) {
  return (
    <TableRow hover>
      <TableCell sx={{ fontWeight: 500, maxWidth: 220, overflowWrap: 'anywhere' }}>{lead.name}</TableCell>
      <TableCell sx={{ maxWidth: 260, overflowWrap: 'anywhere' }}>
        <EmailLink email={lead.email} />
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <PhoneLink mobile={lead.mobile} />
      </TableCell>
      <TableCell>
        <StatusChip status={lead.status} />
      </TableCell>
      <TableCell>
        <PriorityChip priority={lead.priority} />
      </TableCell>
      <TableCell align="right">
        <LeadActions lead={lead} onEdit={onEdit} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  );
}

export default memo(LeadTableRow);
