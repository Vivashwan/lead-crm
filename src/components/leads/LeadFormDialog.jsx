import { useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import {
  DEFAULT_PRIORITY,
  DEFAULT_STATUS,
  LEAD_FIELDS,
  LIMITS,
  PRIORITY_LIST,
  PRIORITY_META,
  STATUS_LIST,
  STATUS_META,
} from '../../constants/leads';
import { normalizeLead, validateLead } from '../../domain/validation';
import { toUserMessage } from '../../services/leadService';

const emptyValues = { name: '', email: '', mobile: '', status: DEFAULT_STATUS, priority: DEFAULT_PRIORITY };

const initialValues = (lead) =>
  lead
    ? { name: lead.name, email: lead.email, mobile: lead.mobile, status: lead.status, priority: lead.priority }
    : emptyValues;

const fieldErrors = (values) => validateLead(normalizeLead(values)).errors;

// Create / edit form. `onSubmit(values)` may reject with a ValidationError (shown per
// field) or any other error (shown above the form). The parent remounts it per opening.
export default function LeadFormDialog({ open, lead = null, onClose, onSubmit }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isEdit = Boolean(lead);

  const [values, setValues] = useState(() => initialValues(lead));
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef({});

  const clientErrors = fieldErrors(values);
  const errorFor = (field) =>
    serverErrors[field] || ((touched[field] || submitted) && clientErrors[field]) || '';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((v) => ({ ...v, [name]: value }));
    setServerErrors((e) => ({ ...e, [name]: undefined }));
    setFormError('');
  };

  const handleBlur = (event) => setTouched((t) => ({ ...t, [event.target.name]: true }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    setFormError('');

    const firstInvalid = LEAD_FIELDS.find((f) => clientErrors[f]);
    if (firstInvalid) {
      inputRefs.current[firstInvalid]?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      if (err?.errors) {
        setServerErrors(err.errors);
        const field = LEAD_FIELDS.find((f) => err.errors[f]);
        if (field) inputRefs.current[field]?.focus();
        else setFormError(toUserMessage(err));
      } else {
        setFormError(toUserMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const textField = (name, label, extra = {}) => (
    <TextField
      name={name}
      label={label}
      value={values[name]}
      onChange={handleChange}
      onBlur={handleBlur}
      error={Boolean(errorFor(name))}
      helperText={errorFor(name) || extra.hint || ' '}
      required
      fullWidth
      inputRef={(el) => (inputRefs.current[name] = el)}
      {...extra.props}
    />
  );

  const selectField = (name, label, list, meta) => (
    <TextField
      select
      name={name}
      label={label}
      value={values[name]}
      onChange={handleChange}
      onBlur={handleBlur}
      error={Boolean(errorFor(name))}
      helperText={errorFor(name) || ' '}
      required
      fullWidth
      inputRef={(el) => (inputRefs.current[name] = el)}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
    >
      {list.map((value) => (
        <option key={value} value={value}>
          {meta[value].label}
        </option>
      ))}
    </TextField>
  );

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby="lead-form-title"
    >
      <form noValidate onSubmit={handleSubmit}>
        <DialogTitle id="lead-form-title">{isEdit ? 'Edit lead' : 'Add lead'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={1} sx={{ pt: 1 }}>
            {textField('name', 'Name', {
              props: { autoFocus: true, autoComplete: 'name', slotProps: { htmlInput: { maxLength: LIMITS.NAME_MAX } } },
            })}
            {textField('email', 'Email', {
              props: { type: 'email', autoComplete: 'email', slotProps: { htmlInput: { maxLength: LIMITS.EMAIL_MAX } } },
            })}
            {textField('mobile', 'Mobile', {
              hint: `${LIMITS.MOBILE_LENGTH} digits, numbers only`,
              props: {
                type: 'tel',
                autoComplete: 'tel-national',
                slotProps: { htmlInput: { maxLength: LIMITS.MOBILE_LENGTH, inputMode: 'numeric', pattern: '[0-9]*' } },
              },
            })}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }}>
              {selectField('status', 'Status', STATUS_LIST, STATUS_META)}
              {selectField('priority', 'Priority', PRIORITY_LIST, PRIORITY_META)}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add lead'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
