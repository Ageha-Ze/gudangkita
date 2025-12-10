'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Building2 } from 'lucide-react';
import { Customer } from '@/types/customer';
import { getCustomers, deleteCustomer } from './actions';
import CustomerModal from './CustomerModal';
import DeleteModal from '@/components/DeleteModal';

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getCustomers();

      if (result.success) {
        setCustomers(result.data || []);
        setFilteredCustomers(result.data || []);
      } else {
        let errorMessage = 'Gagal memuat data customer';
        if (result.error?.includes('authentication') || result.error?.includes('401')) {
          errorMessage = 'Sesi login telah berakhir. Silakan login kembali.';
        } else if (result.error?.includes('authorization') || result.error?.includes('403')) {
          errorMessage = 'Anda tidak memiliki akses untuk melihat data customer.';
        } else if (result.error?.includes('500')) {
          errorMessage = 'Server mengalami masalah. Silakan coba lagi dalam beberapa saat.';
        } else if (result.error) {
          errorMessage += ': ' + result.error;
        }
        setError(errorMessage);
        setCustomers([]);
        setFilteredCustomers([]);
      }
    } catch (error: any) {
      console.error('Error loading customers:', error);
      let errorMessage = 'Terjadi kesalahan saat memuat data. Silakan periksa koneksi internet Anda.';
      if (error.message?.includes('NetworkError') || error.message?.includes('ECONNREFUSED')) {
        errorMessage = 'Koneksi internet bermasalah. Tidak dapat memuat data customer.';
      }
      setError(errorMessage);
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      setCurrentPage(1);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = customers.filter(
      (customer) =>
        customer.nama?.toLowerCase().includes(term) ||
        customer.kode_customer?.toLowerCase().includes(term) ||
        customer.alamat?.toLowerCase().includes(term) ||
        customer.no_hp?.toLowerCase().includes(term) ||
        customer.cabang?.nama_cabang?.toLowerCase().includes(term)
    );

    setFilteredCustomers(filtered);
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredCustomers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteCustomer(customerToDelete.id);

      if (result.success) {
        await loadCustomers();
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);

        // Success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-3';
        successDiv.innerHTML = `
          <span class="text-green-600">✅</span>
          <div>
            <p class="font-semibold">Customer Dihapus!</p>
            <p class="text-sm">Customer <strong>${customerToDelete.nama}</strong> telah berhasil dihapus.</p>
          </div>
          <button onclick="this.parentElement.remove()" class="text-green-700 hover:text-green-900 font-bold">×</button>
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
      } else {
        let errorMessage = 'Gagal menghapus customer';

        if (result.error?.includes('authentication') || result.error?.includes('401')) {
          errorMessage = 'Sesi login telah berakhir. Silakan login kembali.';
        } else if (result.error?.includes('authorization') || result.error?.includes('403')) {
          errorMessage = 'Anda tidak memiliki akses untuk menghapus customer.';
        } else if (result.error?.includes('reference') || result.error?.includes('still in use')) {
          errorMessage = 'Customer tidak dapat dihapus karena masih ada transaksi terkait.';
        } else if (result.error?.includes('500')) {
          errorMessage = 'Server mengalami masalah. Silakan coba lagi dalam beberapa saat.';
        } else if (result.error) {
          errorMessage += ': ' + result.error;
        }

        setError(errorMessage);
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);
      }
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      const errorMessage = error.message?.includes('NetworkError') || error.message?.includes('ECONNREFUSED') ?
        'Koneksi internet bermasalah. Customer tidak dapat dihapus.' :
        'Terjadi kesalahan saat menghapus customer. Silakan coba lagi.';
      setError(errorMessage);
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalSuccess = () => {
    loadCustomers();
  };

  // Stats calculations
  const totalCustomers = customers.length;
  const activeBranches = new Set(customers.map(c => c.cabang_id)).size;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Cards - Mini Version */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-medium">Total Customer</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalCustomers}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-medium">Cabang Aktif</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeBranches}</p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 shadow-sm text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium">Customer Baru</p>
              <p className="text-2xl font-bold mt-1">+{customers.length > 0 ? 1 : 0}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Plus className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold">Master Data Customer</h3>
              <p className="text-blue-100 mt-1">Manage customers efficiently</p>
            </div>
            <button
              onClick={handleAddCustomer}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <Plus size={20} className="mr-2" />
              Tambah Customer
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          {/* Search and Info */}
          <div className="mb-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredCustomers.length)} dari {filteredCustomers.length} data
            </div>
            <div className="relative w-80">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Kode Customer</th>
                  <th className="px-6 py-4 text-left font-semibold">Nama Customer</th>
                  <th className="px-6 py-4 text-left font-semibold">Alamat</th>
                  <th className="px-6 py-4 text-left font-semibold">No. HP</th>
                  <th className="px-6 py-4 text-left font-semibold">Kantor</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium">Memuat data...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentData.length > 0 ? (
                  currentData.map((customer, idx) => (
                    <tr
                      key={customer.id}
                      className={`${
                        idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } hover:bg-blue-50 transition-colors duration-200`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {customer.nama.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-mono text-sm text-gray-800 font-semibold">
                            {customer.kode_customer}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium">{customer.nama}</td>
                      <td className="px-6 py-4 text-gray-700 text-sm">
                        {customer.alamat || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-mono text-sm">
                        {customer.no_hp || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {customer.cabang ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            <Building2 className="w-3.5 h-3.5" />
                            {customer.cabang.nama_cabang}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(customer)}
                            className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'Tidak ada data yang cocok dengan pencarian' : 'Belum ada data'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredCustomers.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentPage === page
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={selectedCustomer}
        onSuccess={handleModalSuccess}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName="Customer"
        itemValue={customerToDelete?.nama || ''}
      />
    </div>
  );
}
