import { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';

interface ModalPrintNotaProps {
  isOpen: boolean;
  onClose: () => void;
  penjualanId: number;
}

interface DetailPenjualan {
  id: number;
  jumlah: number;
  harga: number;
  subtotal: number;
  produk: {
    nama_produk: string;
  };
}

interface PenjualanData {
  id: number;
  tanggal: string;
  nota_penjualan: string;
  jenis_pembayaran: string;
  customer: {
    nama: string;
  };
  pegawai: {
    nama: string;
    cabang: {
      nama_cabang: string;
      alamat: string;
      no_telp: string;
      email: string;
    };
  };
  detail_penjualan: DetailPenjualan[];
  biaya_ongkir: number;
  biaya_potong: number;
  nilai_diskon: number;
  uang_muka: number;
  total: number;
}

export default function ModalPrintNota({
  isOpen,
  onClose,
  penjualanId,
}: ModalPrintNotaProps) {
  const [penjualan, setPenjualan] = useState<PenjualanData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && penjualanId) {
      fetchPenjualan();
    }
  }, [isOpen, penjualanId]);

  const fetchPenjualan = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/transaksi/penjualan/${penjualanId}`);
      const json = await res.json();
      setPenjualan(json.data);
    } catch (error) {
      console.error('Error fetching penjualan:', error);
      alert('Gagal memuat data penjualan');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const subtotal = penjualan?.detail_penjualan?.reduce(
    (sum, item) => sum + item.subtotal,
    0
  ) || 0;

  const grandTotal = 
    subtotal + 
    (penjualan?.biaya_ongkir || 0) + 
    (penjualan?.biaya_potong || 0) - 
    (penjualan?.nilai_diskon || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - No Print */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-bold">Preview Nota Penjualan</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <Printer size={18} />
              Print Document
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <X size={18} />
              Close Window
            </button>
          </div>
        </div>

        {/* Content - Printable */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !penjualan ? (
            <div className="text-center py-8 text-red-600">
              <p>Data tidak ditemukan</p>
              <p className="text-sm mt-2">Penjualan ID: {penjualanId}</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {/* Header Nota - Dynamic dari Cabang */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">
                  {penjualan.pegawai?.cabang?.nama_cabang || 'Nama Cabang'}
                </h1>
                <p className="text-sm">
                  {penjualan.pegawai?.cabang?.alamat || '-'}
                </p>
                <p className="text-sm">
                  {penjualan.pegawai?.cabang?.no_telp || '-'}
                </p>
                <p className="text-sm">
                  {penjualan.pegawai?.cabang?.email || '-'}
                </p>
              </div>

              {/* Judul */}
              <div className="text-center border-t-2 border-b-2 border-black py-2 mb-4">
                <h2 className="text-lg font-bold">NOTA PENJUALAN BARANG</h2>
              </div>

              {/* Info Penjualan */}
              <div className="grid grid-cols-2 gap-x-8 mb-6 text-sm">
                <div>
                  <div className="flex">
                    <span className="w-40">No. Nota</span>
                    <span>: {penjualan.nota_penjualan}</span>
                  </div>
                  <div className="flex">
                    <span className="w-40">Tanggal Jual</span>
                    <span>: {new Date(penjualan.tanggal).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex">
                    <span className="w-40">Rekening Pembayaran</span>
                    <span>: {penjualan.jenis_pembayaran}</span>
                  </div>
                  <div className="flex">
                    <span className="w-40">Cabang</span>
                    <span>: {penjualan.pegawai?.cabang?.nama_cabang}</span>
                  </div>
                </div>
                <div>
                  <div className="flex">
                    <span className="w-40">Customer</span>
                    <span>: {penjualan.customer?.nama}</span>
                  </div>
                  <div className="flex">
                    <span className="w-40">Sales</span>
                    <span>: {penjualan.pegawai?.nama}</span>
                  </div>
                  <div className="flex">
                    <span className="w-40">Jenis Pembayaran</span>
                    <span>: {penjualan.jenis_pembayaran}</span>
                  </div>
                </div>
              </div>

              {/* Biaya */}
              <div className="grid grid-cols-2 gap-x-8 mb-6 text-sm">
                <div>
                  <div className="flex">
                    <span className="w-40">Terbayar</span>
                    <span>: Rp. {(penjualan.uang_muka || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex">
                    <span className="w-40">Tagihan</span>
                    <span>: Rp. {(grandTotal - (penjualan.uang_muka || 0)).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Detail Penjualan */}
              <div className="border-t-2 border-b-2 border-black py-2 mb-4">
                <h3 className="text-center font-bold">DETAIL PENJUALAN</h3>
              </div>

              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-left py-2">Nama Produk</th>
                    <th className="text-right py-2">Harga Jual</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-center py-2">Box</th>
                    <th className="text-right py-2">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {penjualan.detail_penjualan.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.produk.nama_produk}</td>
                      <td className="text-right">Rp. {item.harga.toLocaleString('id-ID')}</td>
                      <td className="text-center">{item.jumlah.toFixed(2)}</td>
                      <td className="text-center">0</td>
                      <td className="text-right">Rp. {item.subtotal.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-end mb-8">
                <div className="w-64 text-sm">
                  <div className="flex justify-between py-1">
                    <span>Sub Total:</span>
                    <span className="font-semibold">Rp. {subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Uang Muka:</span>
                    <span>Rp. {(penjualan.uang_muka || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Nilai Disc:</span>
                    <span>Rp. {(penjualan.nilai_diskon || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Biaya Kirim:</span>
                    <span>Rp. {(penjualan.biaya_ongkir || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Biaya Potong:</span>
                    <span>Rp. {(penjualan.biaya_potong || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-black font-bold text-base">
                    <span>Grand Total:</span>
                    <span>Rp. {grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="grid grid-cols-2 gap-8 text-center text-sm mt-12">
                <div>
                  <p className="mb-16">Mengetahui,</p>
                  <p>( _________________ )</p>
                  <p className="mt-2">Supplier</p>
                </div>
                <div>
                  <p className="mb-16">Mengetahui,</p>
                  <p>( _________________ )</p>
                  <p className="mt-2">Supplier</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - No Print */}
        <div className="flex justify-end gap-2 p-4 border-t print:hidden bg-gray-50">
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Print Document
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close Window
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .fixed {
            position: static !important;
          }
          .bg-black {
            background: none !important;
          }
          .max-w-2xl {
            max-width: 100% !important;
          }
          .p-8 {
            padding: 0 !important;
          }
          .overflow-y-auto {
            overflow: visible !important;
          }
          .max-h-\\[90vh\\] {
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}