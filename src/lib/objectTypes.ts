// Object Types system - TypeScript interfaces and constants

export type ObjectFieldType = 'text' | 'number' | 'price' | 'select' | 'relation' | 'object';

export interface ObjectType {
  id: string;
  tenant_id: string;
  name: string;
  name_plural: string;
  icon: string;
  is_archived: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ObjectTypeField {
  id: string;
  tenant_id: string;
  object_type_id: string;
  name: string;
  label: string;
  field_type: ObjectFieldType;
  field_config: FieldConfig;
  is_required: boolean;
  is_searchable: boolean;
  display_order: number;
  created_at: string;
}

export interface FieldConfig {
  // For text fields
  max_length?: number;
  // For number fields
  min?: number;
  max?: number;
  decimals?: number;
  // For price fields
  currency?: string;
  // For select fields
  options?: string[];
  // For relation fields (contact)
  relation_type?: 'contact';
  // For object relation fields
  related_object_type_id?: string;
  // Index signature for JSON compatibility
  [key: string]: unknown;
}

export interface ObjectStatus {
  id: string;
  tenant_id: string;
  object_type_id: string;
  name: string;
  color: string;
  is_default: boolean;
  display_order: number;
  created_at: string;
}

export interface BusinessObject {
  id: string;
  tenant_id: string;
  object_type_id: string;
  status_id?: string;
  display_name: string;
  is_archived: boolean;
  metadata: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  status?: ObjectStatus;
  object_type?: ObjectType;
}

export interface ConversationObject {
  id: string;
  tenant_id: string;
  conversation_id: string;
  object_id: string;
  linked_by?: string;
  linked_at: string;
  // Joined data
  object?: BusinessObject;
}

// Available icons for object types
export const OBJECT_TYPE_ICONS = [
  'Package',
  'Home',
  'Car',
  'Truck',
  'Box',
  'ShoppingBag',
  'Laptop',
  'Phone',
  'Watch',
  'Gem',
  'Building',
  'Building2',
  'Warehouse',
  'Factory',
  'Store',
  'Briefcase',
  'FileText',
  'Ticket',
  'Tag',
  'Gift',
] as const;

// Field type configuration
export const FIELD_TYPES: { value: ObjectFieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Short or long text' },
  { value: 'number', label: 'Number', description: 'Numeric value' },
  { value: 'price', label: 'Price', description: 'Monetary value with currency' },
  { value: 'select', label: 'Select', description: 'Dropdown with predefined options' },
  { value: 'relation', label: 'Contact', description: 'Link to a contact' },
  { value: 'object', label: 'Object', description: 'Link to another object type' },
];

// Common currencies
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
];

// Status colors
export const STATUS_COLORS = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
];
