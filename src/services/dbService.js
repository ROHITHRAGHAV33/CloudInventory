import { db, isFirebaseConnected, disableFirebaseConnection } from '../firebase';
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

// Helper to generate unique IDs for mock mode
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

// --- MOCK STORAGE HELPERS (localStorage) ---
const getMockData = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveMockData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const insertMockRecord = (key, record) => {
  const data = getMockData(key);
  const newRecord = { ...record, id: record.id || generateId(), createdAt: new Date().toISOString() };
  data.push(newRecord);
  saveMockData(key, data);
  return newRecord;
};

// --- DATABASE SERVICE INTERFACE ---
export const dbService = {
  // ================= USER OPERATIONS =================
  async getUserProfile(uid) {
    if (isFirebaseConnected) {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await withTimeout(getDoc(userRef));
        return userSnap.exists() ? userSnap.data() : null;
      } catch (error) {
        console.error("Firestore getUserProfile failed, falling back to local:", error);
        disableFirebaseConnection();
        const users = getMockData('mock_users');
        return users.find(u => u.uid === uid) || null;
      }
    } else {
      const users = getMockData('mock_users');
      return users.find(u => u.uid === uid) || null;
    }
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

    if (isFirebaseConnected) {
      try {
        await withTimeout(setDoc(doc(db, 'users', uid), profile));
        return profile;
      } catch (error) {
        console.error("Firestore createUserProfile failed, falling back to local:", error);
        disableFirebaseConnection();
        const users = getMockData('mock_users');
        const filtered = users.filter(u => u.uid !== uid);
        filtered.push(profile);
        saveMockData('mock_users', filtered);
        return profile;
      }
    } else {
      const users = getMockData('mock_users');
      const filtered = users.filter(u => u.uid !== uid);
      filtered.push(profile);
      saveMockData('mock_users', filtered);
      return profile;
    }
  },

  // ================= BUSINESS OPERATIONS =================
  async getBusiness(businessId) {
    if (isFirebaseConnected) {
      try {
        const bizRef = doc(db, 'businesses', businessId);
        const bizSnap = await withTimeout(getDoc(bizRef));
        return bizSnap.exists() ? bizSnap.data() : null;
      } catch (error) {
        console.error("Firestore getBusiness failed, falling back to local:", error);
        disableFirebaseConnection();
        const businesses = getMockData('mock_businesses');
        return businesses.find(b => b.id === businessId) || null;
      }
    } else {
      const businesses = getMockData('mock_businesses');
      return businesses.find(b => b.id === businessId) || null;
    }
  },

  async createBusiness(businessData) {
    const businessId = generateId();
    const newBusiness = {
      id: businessId,
      name: businessData.name,
      type: businessData.type, // 'grocery' | 'medical' | 'rice'
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConnected) {
      try {
        await withTimeout(setDoc(doc(db, 'businesses', businessId), newBusiness));
        return newBusiness;
      } catch (error) {
        console.error("Firestore createBusiness failed, falling back to local:", error);
        disableFirebaseConnection();
        insertMockRecord('mock_businesses', newBusiness);
        return newBusiness;
      }
    } else {
      insertMockRecord('mock_businesses', newBusiness);
      return newBusiness;
    }
  },

  // ================= PRODUCT OPERATIONS =================
  async getProducts(businessId) {
    if (isFirebaseConnected) {
      try {
        const q = query(collection(db, 'products'), where('businessId', '==', businessId));
        const querySnapshot = await withTimeout(getDocs(q));
        const products = [];
        querySnapshot.forEach((doc) => {
          products.push({ id: doc.id, ...doc.data() });
        });
        return products;
      } catch (error) {
        console.error("Firestore getProducts failed, falling back to local:", error);
        disableFirebaseConnection();
        const products = getMockData('mock_products');
        return products.filter(p => p.businessId === businessId);
      }
    } else {
      const products = getMockData('mock_products');
      return products.filter(p => p.businessId === businessId);
    }
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

    if (isFirebaseConnected) {
      try {
        const docRef = await withTimeout(addDoc(collection(db, 'products'), newProduct));
        return { id: docRef.id, ...newProduct };
      } catch (error) {
        console.error("Firestore addProduct failed, falling back to local:", error);
        disableFirebaseConnection();
        return insertMockRecord('mock_products', newProduct);
      }
    } else {
      return insertMockRecord('mock_products', newProduct);
    }
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

    if (isFirebaseConnected) {
      try {
        const docRef = doc(db, 'products', productId);
        await withTimeout(updateDoc(docRef, updatedFields));
        return { id: productId, ...updatedFields };
      } catch (error) {
        console.error("Firestore updateProduct failed, falling back to local:", error);
        disableFirebaseConnection();
        const products = getMockData('mock_products');
        const idx = products.findIndex(p => p.id === productId && p.businessId === businessId);
        if (idx !== -1) {
          products[idx] = { ...products[idx], ...updatedFields };
          saveMockData('mock_products', products);
          return products[idx];
        }
        throw new Error('Product not found', { cause: error });
      }
    } else {
      const products = getMockData('mock_products');
      const idx = products.findIndex(p => p.id === productId && p.businessId === businessId);
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...updatedFields };
        saveMockData('mock_products', products);
        return products[idx];
      }
      throw new Error('Product not found');
    }
  },

  async deleteProduct(businessId, productId) {
    if (isFirebaseConnected) {
      try {
        const docRef = doc(db, 'products', productId);
        await withTimeout(deleteDoc(docRef));
        return true;
      } catch (error) {
        console.error("Firestore deleteProduct failed, falling back to local:", error);
        disableFirebaseConnection();
        const products = getMockData('mock_products');
        const filtered = products.filter(p => !(p.id === productId && p.businessId === businessId));
        saveMockData('mock_products', filtered);
        return true;
      }
    } else {
      const products = getMockData('mock_products');
      const filtered = products.filter(p => !(p.id === productId && p.businessId === businessId));
      saveMockData('mock_products', filtered);
      return true;
    }
  },

  // ================= SUPPLIER OPERATIONS =================
  async getSuppliers(businessId) {
    if (isFirebaseConnected) {
      try {
        const q = query(collection(db, 'suppliers'), where('businessId', '==', businessId));
        const querySnapshot = await withTimeout(getDocs(q));
        const suppliers = [];
        querySnapshot.forEach((doc) => {
          suppliers.push({ id: doc.id, ...doc.data() });
        });
        return suppliers;
      } catch (error) {
        console.error("Firestore getSuppliers failed, falling back to local:", error);
        disableFirebaseConnection();
        const suppliers = getMockData('mock_suppliers');
        return suppliers.filter(s => s.businessId === businessId);
      }
    } else {
      const suppliers = getMockData('mock_suppliers');
      return suppliers.filter(s => s.businessId === businessId);
    }
  },

  async addSupplier(businessId, supplierData) {
    const newSupplier = {
      ...supplierData,
      businessId,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConnected) {
      try {
        const docRef = await withTimeout(addDoc(collection(db, 'suppliers'), newSupplier));
        return { id: docRef.id, ...newSupplier };
      } catch (error) {
        console.error("Firestore addSupplier failed, falling back to local:", error);
        disableFirebaseConnection();
        return insertMockRecord('mock_suppliers', newSupplier);
      }
    } else {
      return insertMockRecord('mock_suppliers', newSupplier);
    }
  },

  async updateSupplier(businessId, supplierId, supplierData) {
    const updatedFields = {
      ...supplierData,
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseConnected) {
      try {
        const docRef = doc(db, 'suppliers', supplierId);
        await withTimeout(updateDoc(docRef, updatedFields));
        return { id: supplierId, ...updatedFields };
      } catch (error) {
        console.error("Firestore updateSupplier failed, falling back to local:", error);
        disableFirebaseConnection();
        const suppliers = getMockData('mock_suppliers');
        const idx = suppliers.findIndex(s => s.id === supplierId && s.businessId === businessId);
        if (idx !== -1) {
          suppliers[idx] = { ...suppliers[idx], ...updatedFields };
          saveMockData('mock_suppliers', suppliers);
          return suppliers[idx];
        }
        throw new Error('Supplier not found', { cause: error });
      }
    } else {
      const suppliers = getMockData('mock_suppliers');
      const idx = suppliers.findIndex(s => s.id === supplierId && s.businessId === businessId);
      if (idx !== -1) {
        suppliers[idx] = { ...suppliers[idx], ...updatedFields };
        saveMockData('mock_suppliers', suppliers);
        return suppliers[idx];
      }
      throw new Error('Supplier not found');
    }
  },

  async deleteSupplier(businessId, supplierId) {
    if (isFirebaseConnected) {
      try {
        const docRef = doc(db, 'suppliers', supplierId);
        await withTimeout(deleteDoc(docRef));
        return true;
      } catch (error) {
        console.error("Firestore deleteSupplier failed, falling back to local:", error);
        disableFirebaseConnection();
        const suppliers = getMockData('mock_suppliers');
        const filtered = suppliers.filter(s => !(s.id === supplierId && s.businessId === businessId));
        saveMockData('mock_suppliers', filtered);
        return true;
      }
    } else {
      const suppliers = getMockData('mock_suppliers');
      const filtered = suppliers.filter(s => !(s.id === supplierId && s.businessId === businessId));
      saveMockData('mock_suppliers', filtered);
      return true;
    }
  },

  // ================= PURCHASE OPERATIONS (LOGS + AUTO STOCK INCREMENT) =================
  async getPurchases(businessId) {
    if (isFirebaseConnected) {
      try {
        const q = query(collection(db, 'purchases'), where('businessId', '==', businessId));
        const querySnapshot = await withTimeout(getDocs(q));
        const purchases = [];
        querySnapshot.forEach((doc) => {
          purchases.push({ id: doc.id, ...doc.data() });
        });
        return purchases;
      } catch (error) {
        console.error("Firestore getPurchases failed, falling back to local:", error);
        disableFirebaseConnection();
        const purchases = getMockData('mock_purchases');
        return purchases.filter(p => p.businessId === businessId);
      }
    } else {
      const purchases = getMockData('mock_purchases');
      return purchases.filter(p => p.businessId === businessId);
    }
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

    if (isFirebaseConnected) {
      try {
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
      } catch (error) {
        console.error("Firestore addPurchase failed, falling back to local:", error);
        disableFirebaseConnection();
        
        // Local fallback execution
        const products = getMockData('mock_products');
        const pIdx = products.findIndex(p => p.id === purchaseData.productId && p.businessId === businessId);
        if (pIdx !== -1) {
          products[pIdx].stock = (Number(products[pIdx].stock) || 0) + quantity;
          saveMockData('mock_products', products);
        }
        return insertMockRecord('mock_purchases', newPurchase);
      }
    } else {
      // 1. Update product stock in mock
      const products = getMockData('mock_products');
      const pIdx = products.findIndex(p => p.id === purchaseData.productId && p.businessId === businessId);
      if (pIdx !== -1) {
        products[pIdx].stock = (Number(products[pIdx].stock) || 0) + quantity;
        saveMockData('mock_products', products);
      }

      // 2. Log purchase record
      return insertMockRecord('mock_purchases', newPurchase);
    }
  },

  // ================= SALES OPERATIONS (LOGS + AUTO STOCK DECREMENT) =================
  async getSales(businessId) {
    if (isFirebaseConnected) {
      try {
        const q = query(collection(db, 'sales'), where('businessId', '==', businessId));
        const querySnapshot = await withTimeout(getDocs(q));
        const sales = [];
        querySnapshot.forEach((doc) => {
          sales.push({ id: doc.id, ...doc.data() });
        });
        return sales;
      } catch (error) {
        console.error("Firestore getSales failed, falling back to local:", error);
        disableFirebaseConnection();
        const sales = getMockData('mock_sales');
        return sales.filter(s => s.businessId === businessId);
      }
    } else {
      const sales = getMockData('mock_sales');
      return sales.filter(s => s.businessId === businessId);
    }
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

    if (isFirebaseConnected) {
      try {
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
      } catch (error) {
        console.error("Firestore addSale failed, falling back to local:", error);
        disableFirebaseConnection();
        
        // Local fallback execution
        const products = getMockData('mock_products');
        for (const item of items) {
          const pIdx = products.findIndex(p => p.id === item.productId && p.businessId === businessId);
          if (pIdx !== -1) {
            const currentStock = Number(products[pIdx].stock) || 0;
            products[pIdx].stock = Math.max(0, currentStock - item.quantity);
          }
        }
        saveMockData('mock_products', products);
        return insertMockRecord('mock_sales', newSale);
      }
    } else {
      // 1. Update product stocks in mock
      const products = getMockData('mock_products');
      for (const item of items) {
        const pIdx = products.findIndex(p => p.id === item.productId && p.businessId === businessId);
        if (pIdx !== -1) {
          const currentStock = Number(products[pIdx].stock) || 0;
          products[pIdx].stock = Math.max(0, currentStock - item.quantity);
        }
      }
      saveMockData('mock_products', products);

      // 2. Log sale record
      return insertMockRecord('mock_sales', newSale);
    }
  }
};
