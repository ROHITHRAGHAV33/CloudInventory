import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc
} from 'firebase/firestore';

// Helper to generate unique IDs
const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
};

// Helper to set a timeout on Firestore promises to prevent infinite hangs
const withTimeout = (promise, timeoutMs = 4000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore operation timed out')), timeoutMs)
    )
  ]);
};

// --- DATABASE SERVICE INTERFACE ---
export const dbService = {
  // ================= USER OPERATIONS =================
  async getUserProfile(uid) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await withTimeout(getDoc(userRef));
    return userSnap.exists() ? userSnap.data() : null;
  },

  async createUserProfile(uid, userData) {
    const profile = {
      uid,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      businessId: userData.businessId,
      role: userData.role || 'owner',
      createdAt: new Date().toISOString()
    };
    await withTimeout(setDoc(doc(db, 'users', uid), profile));
    return profile;
  },

  // ================= BUSINESS OPERATIONS =================
  async getBusiness(businessId) {
    const bizRef = doc(db, 'businesses', businessId);
    const bizSnap = await withTimeout(getDoc(bizRef));
    return bizSnap.exists() ? bizSnap.data() : null;
  },

  async createBusiness(businessData) {
    const businessId = generateId();
    const newBusiness = {
      id: businessId,
      name: businessData.name,
      type: businessData.type, // 'grocery' | 'medical' | 'rice'
      createdAt: new Date().toISOString()
    };
    await withTimeout(setDoc(doc(db, 'businesses', businessId), newBusiness));
    return newBusiness;
  },

  // ================= PRODUCT OPERATIONS =================
  async getProducts(businessId) {
    const q = query(collection(db, 'products'), where('businessId', '==', businessId));
    const querySnapshot = await withTimeout(getDocs(q));
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return products;
  },

  async addProduct(businessId, productData) {
    const newProduct = {
      ...productData,
      businessId,
      stock: Number(productData.stock) || 0,
      buyingPrice: Number(productData.buyingPrice) || 0,
      sellingPrice: Number(productData.sellingPrice) || 0,
      minStockAlert: Number(productData.minStockAlert) || 5,
      createdAt: new Date().toISOString()
    };
    const docRef = await withTimeout(addDoc(collection(db, 'products'), newProduct));
    return { id: docRef.id, ...newProduct };
  },

  async updateProduct(businessId, productId, productData) {
    const updatedFields = {
      ...productData,
      stock: Number(productData.stock) || 0,
      buyingPrice: Number(productData.buyingPrice) || 0,
      sellingPrice: Number(productData.sellingPrice) || 0,
      minStockAlert: Number(productData.minStockAlert) || 5,
      updatedAt: new Date().toISOString()
    };
    const docRef = doc(db, 'products', productId);
    await withTimeout(updateDoc(docRef, updatedFields));
    return { id: productId, ...updatedFields };
  },

  async deleteProduct(businessId, productId) {
    const docRef = doc(db, 'products', productId);
    await withTimeout(deleteDoc(docRef));
    return true;
  },

  // ================= SUPPLIER OPERATIONS =================
  async getSuppliers(businessId) {
    const q = query(collection(db, 'suppliers'), where('businessId', '==', businessId));
    const querySnapshot = await withTimeout(getDocs(q));
    const suppliers = [];
    querySnapshot.forEach((doc) => {
      suppliers.push({ id: doc.id, ...doc.data() });
    });
    return suppliers;
  },

  async addSupplier(businessId, supplierData) {
    const newSupplier = {
      ...supplierData,
      businessId,
      createdAt: new Date().toISOString()
    };
    const docRef = await withTimeout(addDoc(collection(db, 'suppliers'), newSupplier));
    return { id: docRef.id, ...newSupplier };
  },

  async updateSupplier(businessId, supplierId, supplierData) {
    const updatedFields = {
      ...supplierData,
      updatedAt: new Date().toISOString()
    };
    const docRef = doc(db, 'suppliers', supplierId);
    await withTimeout(updateDoc(docRef, updatedFields));
    return { id: supplierId, ...updatedFields };
  },

  async deleteSupplier(businessId, supplierId) {
    const docRef = doc(db, 'suppliers', supplierId);
    await withTimeout(deleteDoc(docRef));
    return true;
  },

  // ================= PURCHASE OPERATIONS (LOGS + AUTO STOCK INCREMENT) =================
  async getPurchases(businessId) {
    const q = query(collection(db, 'purchases'), where('businessId', '==', businessId));
    const querySnapshot = await withTimeout(getDocs(q));
    const purchases = [];
    querySnapshot.forEach((doc) => {
      purchases.push({ id: doc.id, ...doc.data() });
    });
    return purchases;
  },

  async addPurchase(businessId, purchaseData) {
    const quantity = Number(purchaseData.quantity) || 0;
    const unitPrice = Number(purchaseData.unitPrice) || 0;
    const totalPrice = quantity * unitPrice;

    const newPurchase = {
      businessId,
      productId: purchaseData.productId,
      productName: purchaseData.productName,
      supplierId: purchaseData.supplierId,
      supplierName: purchaseData.supplierName,
      quantity,
      unitPrice,
      totalPrice,
      purchaseDate: purchaseData.purchaseDate || new Date().toISOString()
    };

    // 1. Log the purchase
    const purchaseRef = await withTimeout(addDoc(collection(db, 'purchases'), newPurchase));
    
    // 2. Fetch and update the product stock
    const productRef = doc(db, 'products', purchaseData.productId);
    const productSnap = await withTimeout(getDoc(productRef));
    if (productSnap.exists()) {
      const currentStock = Number(productSnap.data().stock) || 0;
      await withTimeout(updateDoc(productRef, { stock: currentStock + quantity }));
    }
    return { id: purchaseRef.id, ...newPurchase };
  },

  // ================= SALES OPERATIONS (LOGS + AUTO STOCK DECREMENT) =================
  async getSales(businessId) {
    const q = query(collection(db, 'sales'), where('businessId', '==', businessId));
    const querySnapshot = await withTimeout(getDocs(q));
    const sales = [];
    querySnapshot.forEach((doc) => {
      sales.push({ id: doc.id, ...doc.data() });
    });
    return sales;
  },

  async addSale(businessId, saleData) {
    // items: Array of { productId, name, quantity, unitPrice, subtotal }
    const items = saleData.items.map(item => ({
      productId: item.productId,
      name: item.name,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      subtotal: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = Number(saleData.tax) || 0;
    const discount = Number(saleData.discount) || 0;
    const grandTotal = totalAmount + tax - discount;

    const newSale = {
      businessId,
      items,
      totalAmount,
      tax,
      discount,
      grandTotal,
      customerName: saleData.customerName || 'Walk-in Customer',
      saleDate: new Date().toISOString()
    };

    // 1. Log sale record
    const saleRef = await withTimeout(addDoc(collection(db, 'sales'), newSale));

    // 2. Loop and update stocks
    for (const item of items) {
      const productRef = doc(db, 'products', item.productId);
      const productSnap = await withTimeout(getDoc(productRef));
      if (productSnap.exists()) {
        const currentStock = Number(productSnap.data().stock) || 0;
        await withTimeout(updateDoc(productRef, { stock: Math.max(0, currentStock - item.quantity) }));
      }
    }
    return { id: saleRef.id, ...newSale };
  }
};
