import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import * as wechatService from '../services/wechat.service';

export const createWechatOrderController = async (req: Request, res: Response) => {
  try {
    const result = await wechatService.createWechatOrder(req.body.appointmentId, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const createPlanWechatOrderController = async (req: Request, res: Response) => {
  try {
    const result = await wechatService.createPlanWechatOrder(req.body.participantId, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const createProductWechatOrderController = async (req: Request, res: Response) => {
  try {
    const result = await wechatService.createProductWechatOrder(req.body.orderId, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getWechatOrder = async (req: Request, res: Response) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { appointmentId: req.params.id, provider: 'WECHAT_PAY' },
      include: { appointment: true },
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
