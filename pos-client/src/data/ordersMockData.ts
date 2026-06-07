export type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
export type OrderType = 'Dine-In' | 'Takeout';

export interface PlacementOrder {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  itemsSummary: string;
  itemCount: number;
  total: number;
  payment: 'Cash' | 'GCash' | 'Card';
  placedAt: string;
  label: string;
}

export const samplePlacementOrders: PlacementOrder[] = [
  {
    id: 'ord-4825',
    orderNumber: '#4825',
    type: 'Dine-In',
    status: 'NEW',
    itemsSummary: 'Cheese Mega, Barbecue Regular',
    itemCount: 2,
    total: 275,
    payment: 'GCash',
    placedAt: 'Just now',
    label: 'Counter 1',
  },
  {
    id: 'ord-4824',
    orderNumber: '#4824',
    type: 'Takeout',
    status: 'PREPARING',
    itemsSummary: 'Sour Cream x2, Chicken Pops',
    itemCount: 3,
    total: 365,
    payment: 'Cash',
    placedAt: '3 min ago',
    label: 'Takeout A',
  },
  {
    id: 'ord-4823',
    orderNumber: '#4823',
    type: 'Dine-In',
    status: 'PREPARING',
    itemsSummary: 'Cheese Giga, Iced Tea',
    itemCount: 2,
    total: 245,
    payment: 'GCash',
    placedAt: '6 min ago',
    label: 'Table 4',
  },
  {
    id: 'ord-4822',
    orderNumber: '#4822',
    type: 'Takeout',
    status: 'READY',
    itemsSummary: 'Barbecue Jumbo',
    itemCount: 1,
    total: 105,
    payment: 'Cash',
    placedAt: '8 min ago',
    label: 'Takeout B',
  },
  {
    id: 'ord-4821',
    orderNumber: '#4821',
    type: 'Dine-In',
    status: 'COMPLETED',
    itemsSummary: 'Cheddar Mega, Sweet Corn Regular',
    itemCount: 2,
    total: 260,
    payment: 'GCash',
    placedAt: '10 min ago',
    label: 'Table 2',
  },
  {
    id: 'ord-4820',
    orderNumber: '#4820',
    type: 'Takeout',
    status: 'NEW',
    itemsSummary: 'Chili Cheese Large, Coke Float',
    itemCount: 2,
    total: 195,
    payment: 'Card',
    placedAt: '12 min ago',
    label: 'Takeout C',
  },
  {
    id: 'ord-4819',
    orderNumber: '#4819',
    type: 'Dine-In',
    status: 'PREPARING',
    itemsSummary: 'Mega Fries, Cheese Sticks x2',
    itemCount: 3,
    total: 420,
    payment: 'Cash',
    placedAt: '14 min ago',
    label: 'Table 7',
  },
  {
    id: 'ord-4818',
    orderNumber: '#4818',
    type: 'Takeout',
    status: 'READY',
    itemsSummary: 'Barbecue Regular, Iced Tea',
    itemCount: 2,
    total: 110,
    payment: 'GCash',
    placedAt: '16 min ago',
    label: 'Takeout D',
  },
  {
    id: 'ord-4817',
    orderNumber: '#4817',
    type: 'Dine-In',
    status: 'COMPLETED',
    itemsSummary: 'Garlic Butter Mega, Lemonade',
    itemCount: 2,
    total: 185,
    payment: 'Cash',
    placedAt: '18 min ago',
    label: 'Counter 2',
  },
  {
    id: 'ord-4816',
    orderNumber: '#4816',
    type: 'Takeout',
    status: 'COMPLETED',
    itemsSummary: 'Cheese Regular, Nachos',
    itemCount: 2,
    total: 150,
    payment: 'GCash',
    placedAt: '22 min ago',
    label: 'Takeout E',
  },
];

export const orderStatusLabels: Record<OrderStatus, string> = {
  NEW: 'New',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
};
