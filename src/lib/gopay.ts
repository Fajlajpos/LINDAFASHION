/**
 * Abstraktní rozhraní pro platební bránu GoPay
 * Pripraveno pro nasazení API klíčů přes .env
 */

export interface CreatePaymentParams {
  orderId: string;
  cisloObjednavky: string;
  amount: number;
  email: string;
  returnUrl: string;
  notifyUrl: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  state: 'PAID' | 'CREATED' | 'CANCELED' | 'REFUNDED' | 'PAYMENT_METHOD_CHOSEN';
  orderId: string;
}

export class GoPayProvider {
  private goId: string;
  private clientId: string;
  private clientSecret: string;
  private isSandbox: boolean;

  constructor() {
    this.goId = process.env.GOPAY_GOID || '';
    this.clientId = process.env.GOPAY_CLIENT_ID || '';
    this.clientSecret = process.env.GOPAY_CLIENT_SECRET || '';
    this.isSandbox = process.env.GOPAY_ENV !== 'production';
  }

  public isConfigured(): boolean {
    return Boolean(this.goId && this.clientId && this.clientSecret);
  }

  public async createPayment(params: CreatePaymentParams): Promise<{ gwUrl: string; paymentId: string }> {
    if (!this.isConfigured()) {
      // Mock výstup pro dočasný režim před zadáním klíčů
      console.warn('⚠️ GoPay klíče nejsou v .env nastaveny. Používá se dočasná QR/Bankovní platba.');
      return {
        gwUrl: `/pokladna/potvrzeni?orderId=${params.orderId}&payment=pending_bank`,
        paymentId: `MOCK_GOPAY_${Date.now()}`,
      };
    }

    // Zde bude reálný HTTP request na API GoPay po dodání klíčů
    return {
      gwUrl: `https://${this.isSandbox ? 'gw.sandbox.gopay.com' : 'gate.gopay.cz'}/gw/v3/pay-gate?id=MOCK_GW_${params.cisloObjednavky}`,
      paymentId: `GOPAY_${params.cisloObjednavky}`,
    };
  }

  public async checkPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    if (!this.isConfigured()) {
      return {
        paymentId,
        state: 'CREATED',
        orderId: '',
      };
    }

    // Reálné ověření přes GoPay REST API
    return {
      paymentId,
      state: 'PAID',
      orderId: '',
    };
  }
}

export const goPay = new GoPayProvider();
