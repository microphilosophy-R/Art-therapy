import React from 'react';
import { Calendar, Clock, Video, MapPin, X } from 'lucide-react';
import type { Appointment } from '../../types';
import { formatDate, formatTime, hoursUntil } from '../../utils/formatters';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface AppointmentCardProps {
  appointment: Appointment;
  perspective: 'client' | 'therapist';
  onCancel?: (id: string) => void;
}

const statusVariant = {
  PENDING:   'warning',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
  COMPLETED: 'default',
} as const;

const statusLabel = {
  PENDING:   'Awaiting Payment',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export const AppointmentCard = ({ appointment, perspective, onCancel }: AppointmentCardProps) => {
  const { therapist, client, startTime, endTime, status, medium } = appointment;
  const person = perspective === 'client' ? therapist?.user : client;
  const canCancel = (status === 'CONFIRMED' || status === 'PENDING') && hoursUntil(startTime) > 0;

  if (!person) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar
            firstName={person.firstName}
            lastName={person.lastName}
            src={person.avatarUrl}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-medium text-stone-900">
                  {person.firstName} {person.lastName}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(startTime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {formatTime(startTime)} – {formatTime(endTime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {medium === 'VIDEO'
                      ? <><Video className="h-3.5 w-3.5" /> Video</>
                      : <><MapPin className="h-3.5 w-3.5" /> In Person</>
                    }
                  </span>
                </div>
              </div>
              <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
            </div>
          </div>
        </div>
        {canCancel && onCancel && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(appointment.id)}
              className="text-rose-600 hover:bg-rose-50"
            >
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
