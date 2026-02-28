import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import * as alipayService from '../services/alipay.service';

export const createAlipayOrder = async (req: Request, res: Response) => {
  try {
    const result = await alipayService.createAlipayOrder(req.body.appointmentId, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const createPlanAlipayOrder = async (req: Request, res: Response) => {
  try {
    const result = await alipayService.createPlanAlipayOrder(req.body.participantId, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getAlipayOrder = async (req: Request, res: Response) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { appointmentId: req.params.id, provider: 'ALIPAY' },
      include: { appointment: true },
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
