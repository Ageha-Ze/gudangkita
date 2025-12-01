'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Package, ArrowLeft, ShoppingCart, RotateCcw, CheckCircle } from 'lucide-react';

interface DetailKonsinyasi {
  id: number;
  produk_id: number;
  jumlah_titip: number;
  jumlah_terjual: number;
  jumlah_sisa: number;
  jumlah_kembali: number;
  harga_konsinyasi: number;
  harga_jual_toko: number;
  subtotal_nilai_titip: number;
  keuntungan_toko: number;
  produk?: {
    nama_produk: string;
    kode_produk: string;
    satuan: string;
  };
}

interface KonsinyasiData {
  id: number;
  kode_konsinyasi: string;
  tanggal_titip: string;
  total_nilai_titip: number;
  status: string;
  keterangan?: string;
  toko?: {
    id: number;
    nama_toko: string;
    kode_toko: string;
  };
  cabang?: {
    id: number;
    nama_cabang: string;
  };
  pegawai?: {
    nama: string;
  };
  detail_konsinyasi?: DetailKonsinyasi[];
}

interface Kas {
  id: number;
  nama_kas: string;
  tipe_kas: string;
  saldo: number;
}

export default function DetailKonsinyasiPage() {
  const router = useRouter();
  const params = useParams();
  const konsinyasiId = params.id;

  const [data, setData] = useState<KonsinyasiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'penjualan' | 'retur' | 'edit' | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DetailKonsinyasi | null>(null);
  const [selectedPenjualan, setSelectedPenjualan] = useState<any>(null);
  
  // List penjualan untuk ditampilkan
  const [penjualanList, setPenjualanList] = useState<any[]>([]);

  // List kas untuk dropdown
  const [kasList, setKasList] = useState<Kas[]>([]);
  const [loadingKas, setLoadingKas] = useState(false);

  // Form penjualan
  const [penjualanForm, setPenjualanForm] = useState({
    tanggal_jual: new Date().toISOString().split('T')[0],
    jumlah_terjual: '',
    kas_id: '',
    tanggal_pembayaran: new Date().toISOString().split('T')[0],
    keterangan: '',
  });

  // Form retur
  const [returForm, setReturForm] = useState({
    tanggal_retur: new Date().toISOString().split('T')[0],
    jumlah_retur: '',
    kondisi: 'Baik',
    keterangan: '',
  });

  useEffect(() => {
    fetchData();
  }, [konsinyasiId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/transaksi/konsinyasi/${konsinyasiId}`);
      const json = await res.json();
      setData(json.data);
      
      // Fetch penjualan list
      if (konsinyasiId) {
        fetchPenjualanList();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPenjualanList = async () => {
    try {
      const res = await fetch(`/api/transaksi/konsinyasi/penjualan/list?konsinyasi_id=${konsinyasiId}`);
      const json = await res.json();
      setPenjualanList(json.data || []);
    } catch (error) {
      console.error('Error fetching penjualan:', error);
    }
  };

  const fetchKasList = async (cabangId: number) => {
    try {
      setLoadingKas(true);
      const res = await fetch(`/api/master/kas?cabang_id=${cabangId}`);
      const json = await res.json();
      setKasList(json.data || []);
    } catch (error) {
      console.error('Error fetching kas:', error);
      alert('Gagal memuat data kas');
    } finally {
      setLoadingKas(false);
    }
  };

  const handleOpenPenjualan = (detail: DetailKonsinyasi) => {
    setSelectedDetail(detail);
    setPenjualanForm({
      tanggal_jual: new Date().toISOString().split('T')[0],
      jumlah_terjual: '',
      kas_id: '',
      tanggal_pembayaran: new Date().toISOString().split('T')[0],
      keterangan: '',
    });
    
    // Fetch kas list berdasarkan cabang
    if (data?.cabang?.id) {
      fetchKasList(data.cabang.id);
    }
    
    setActiveModal('penjualan');
  };

  const handleOpenRetur = (detail: DetailKonsinyasi) => {
    setSelectedDetail(detail);
    setReturForm({
      tanggal_retur: new Date().toISOString().split('T')[0],
      jumlah_retur: '',
      kondisi: 'Baik',
      keterangan: '',
    });
    setActiveModal('retur');
  };

  const handleOpenEdit = async (penjualanId: number) => {
    try {
      const res = await fetch(`/api/transaksi/konsinyasi/penjualan/${penjualanId}`);
      const json = await res.json();
      
      if (res.ok && json.data) {
        setSelectedPenjualan(json.data);
        setSelectedDetail(json.data.detail_konsinyasi);
        setPenjualanForm({
          tanggal_jual: json.data.tanggal_jual,
          jumlah_terjual: json.data.jumlah_terjual.toString(),
          kas_id: json.data.kas_id?.toString() || '',
          tanggal_pembayaran: json.data.tanggal_pembayaran || json.data.tanggal_jual,
          keterangan: json.data.keterangan || '',
        });
        
        // Fetch kas list
        if (json.data.detail_konsinyasi?.konsinyasi?.cabang_id) {
          fetchKasList(json.data.detail_konsinyasi.konsinyasi.cabang_id);
        }
        
        setActiveModal('edit');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Gagal memuat data penjualan');
    }
  };

  const handleDeletePenjualan = async (penjualanId: number) => {
    if (!confirm('Yakin ingin menghapus penjualan ini? Stock dan kas akan dikembalikan.')) return;

    try {
      const res = await fetch(`/api/transaksi/konsinyasi/penjualan/${penjualanId}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (res.ok) {
        alert('Penjualan berhasil dihapus');
        fetchData();
      } else {
        alert(json.error || 'Gagal menghapus penjualan');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleSubmitPenjualan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDetail) return;

    const jumlah = parseFloat(penjualanForm.jumlah_terjual);
    
    if (jumlah <= 0) {
      alert('Jumlah terjual harus lebih dari 0');
      return;
    }

    // Untuk edit, validasi berbeda
    if (activeModal === 'edit' && selectedPenjualan) {
      const sisaTersedia = selectedDetail.jumlah_sisa + parseFloat(selectedPenjualan.jumlah_terjual);
      if (jumlah > sisaTersedia) {
        alert(`Jumlah terjual melebihi sisa! Tersedia: ${sisaTersedia}`);
        return;
      }
    } else {
      if (jumlah > selectedDetail.jumlah_sisa) {
        alert(`Jumlah terjual melebihi sisa! Sisa: ${selectedDetail.jumlah_sisa}`);
        return;
      }
    }

    if (!penjualanForm.kas_id) {
      alert('Pilih kas terlebih dahulu');
      return;
    }

    try {
      const url = activeModal === 'edit' 
        ? `/api/transaksi/konsinyasi/penjualan/${selectedPenjualan.id}`
        : '/api/transaksi/konsinyasi/penjualan';
      
      const method = activeModal === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detail_konsinyasi_id: selectedDetail.id,
          tanggal_jual: penjualanForm.tanggal_jual,
          jumlah_terjual: jumlah,
          harga_jual_toko: selectedDetail.harga_jual_toko,
          kas_id: parseInt(penjualanForm.kas_id),
          tanggal_pembayaran: penjualanForm.tanggal_pembayaran,
          keterangan: penjualanForm.keterangan,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        alert(activeModal === 'edit' ? 'Penjualan berhasil diupdate' : 'Penjualan berhasil dicatat dan kas diperbarui');
        setActiveModal(null);
        setSelectedPenjualan(null);
        fetchData();
      } else {
        alert(json.error || 'Gagal memproses penjualan');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleSubmitRetur = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDetail) return;

    const jumlah = parseFloat(returForm.jumlah_retur);
    
    if (jumlah <= 0) {
      alert('Jumlah retur harus lebih dari 0');
      return;
    }

    if (jumlah > selectedDetail.jumlah_sisa) {
      alert(`Jumlah retur melebihi sisa! Sisa: ${selectedDetail.jumlah_sisa}`);
      return;
    }

    try {
      const res = await fetch('/api/transaksi/konsinyasi/retur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detail_konsinyasi_id: selectedDetail.id,
          tanggal_retur: returForm.tanggal_retur,
          jumlah_retur: jumlah,
          kondisi: returForm.kondisi,
          keterangan: returForm.keterangan,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        alert('Retur berhasil dicatat');
        setActiveModal(null);
        fetchData();
      } else {
        alert(json.error || 'Gagal mencatat retur');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleSelesaikan = async () => {
    if (!confirm('Yakin ingin menyelesaikan konsinyasi ini? Status akan berubah menjadi Selesai.')) return;

    try {
      const res = await fetch(`/api/transaksi/konsinyasi/${konsinyasiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Selesai' }),
      });

      if (res.ok) {
        alert('Konsinyasi berhasil diselesaikan');
        fetchData();
      } else {
        alert('Gagal menyelesaikan konsinyasi');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div className="text-center text-xl text-gray-600">Data tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-lg border-l-4 border-indigo-500">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-indigo-100 rounded-lg transition"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="bg-indigo-500 p-3 rounded-lg">
            <Package className="text-white" size={24} />
          </div>
          <div>
            <p className="text-sm text-indigo-600">Detail Konsinyasi</p>
            <h1 className="text-2xl font-bold text-indigo-700">{data.kode_konsinyasi}</h1>
          </div>
        </div>
        {data.status === 'Aktif' && (
          <button
            onClick={handleSelesaikan}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <CheckCircle size={20} />
            Selesaikan
          </button>
        )}
      </div>

      {/* Info Konsinyasi */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Informasi Konsinyasi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Tanggal Titip</p>
            <p className="font-medium">{new Date(data.tanggal_titip).toLocaleDateString('id-ID')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Toko</p>
            <p className="font-medium">{data.toko?.nama_toko || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Cabang</p>
            <p className="font-medium">{data.cabang?.nama_cabang || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pegawai</p>
            <p className="font-medium">{data.pegawai?.nama || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Nilai Titip</p>
            <p className="font-medium text-lg text-indigo-600">
              Rp {data.total_nilai_titip.toLocaleString('id-ID')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              data.status === 'Aktif' ? 'bg-green-100 text-green-800' :
              data.status === 'Selesai' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {data.status}
            </span>
          </div>
        </div>
        {data.keterangan && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">Keterangan</p>
            <p className="font-medium">{data.keterangan}</p>
          </div>
        )}
      </div>

      {/* Detail Barang */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Detail Barang</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-indigo-100">
              <tr>
                <th className="px-4 py-3 text-left border">Produk</th>
                <th className="px-4 py-3 text-right border">Titip</th>
                <th className="px-4 py-3 text-right border">Terjual</th>
                <th className="px-4 py-3 text-right border">Sisa</th>
                <th className="px-4 py-3 text-right border">Kembali</th>
                <th className="px-4 py-3 text-right border">Harga Kita</th>
                <th className="px-4 py-3 text-right border">Harga Toko</th>
                <th className="px-4 py-3 text-right border">Subtotal</th>
                {data.status === 'Aktif' && (
                  <th className="px-4 py-3 text-center border">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.detail_konsinyasi?.map((detail) => (
                <tr key={detail.id} className="border-b hover:bg-indigo-50">
                  <td className="px-4 py-3 border">
                    <div>
                      <p className="font-medium">{detail.produk?.nama_produk}</p>
                      <p className="text-sm text-gray-600">{detail.produk?.kode_produk}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right border">{detail.jumlah_titip}</td>
                  <td className="px-4 py-3 text-right border text-green-600">{detail.jumlah_terjual}</td>
                  <td className="px-4 py-3 text-right border text-blue-600">{detail.jumlah_sisa}</td>
                  <td className="px-4 py-3 text-right border text-orange-600">{detail.jumlah_kembali}</td>
                  <td className="px-4 py-3 text-right border">
                    Rp {detail.harga_konsinyasi.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-right border">
                    Rp {detail.harga_jual_toko.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-right border">
                    Rp {(detail.jumlah_terjual * detail.harga_konsinyasi).toLocaleString('id-ID')}
                  </td>
                  {data.status === 'Aktif' && (
                    <td className="px-4 py-3 border">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenPenjualan(detail)}
                          disabled={detail.jumlah_sisa <= 0}
                          className="p-2 text-green-600 hover:bg-green-100 rounded transition disabled:opacity-50"
                          title="Input Penjualan"
                        >
                          <ShoppingCart size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenRetur(detail)}
                          disabled={detail.jumlah_sisa <= 0}
                          className="p-2 text-orange-600 hover:bg-orange-100 rounded transition disabled:opacity-50"
                          title="Retur Barang"
                        >
                          <RotateCcw size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat Penjualan */}
      {penjualanList.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Riwayat Penjualan</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-green-100">
                <tr>
                  <th className="px-4 py-3 text-left border">Tanggal</th>
                  <th className="px-4 py-3 text-left border">Produk</th>
                  <th className="px-4 py-3 text-right border">Jumlah</th>
                  <th className="px-4 py-3 text-right border">Total Nilai</th>
                  <th className="px-4 py-3 text-left border">Kas</th>
                  <th className="px-4 py-3 text-left border">Status</th>
                  {data?.status === 'Aktif' && (
                    <th className="px-4 py-3 text-center border">Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {penjualanList.map((penjualan) => (
                  <tr key={penjualan.id} className="border-b hover:bg-green-50">
                    <td className="px-4 py-3 border">
                      {new Date(penjualan.tanggal_jual).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 border">
                      <div>
                        <p className="font-medium">{penjualan.detail_konsinyasi?.produk?.nama_produk}</p>
                        <p className="text-sm text-gray-600">{penjualan.detail_konsinyasi?.produk?.kode_produk}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right border">
                      {penjualan.jumlah_terjual} {penjualan.detail_konsinyasi?.produk?.satuan}
                    </td>
                    <td className="px-4 py-3 text-right border font-medium text-green-600">
                      Rp {parseFloat(penjualan.total_nilai_kita).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 border">
                      <div>
                        <p className="font-medium">{penjualan.kas?.nama_kas || '-'}</p>
                        <p className="text-sm text-gray-600">{penjualan.kas?.tipe_kas}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 border">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        penjualan.status_pembayaran === 'Sudah Dibayar' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {penjualan.status_pembayaran}
                      </span>
                    </td>
                    {data?.status === 'Aktif' && (
                      <td className="px-4 py-3 border">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(penjualan.id)}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePenjualan(penjualan.id)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition font-medium"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Penjualan & Edit */}
      {(activeModal === 'penjualan' || activeModal === 'edit') && selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {activeModal === 'edit' ? 'Edit Penjualan & Pembayaran' : 'Input Penjualan & Pembayaran'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Produk: <span className="font-medium">{selectedDetail.produk?.nama_produk}</span><br />
              Sisa: <span className="font-medium">{selectedDetail.jumlah_sisa}</span>
            </p>
            <form onSubmit={handleSubmitPenjualan} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Tanggal Jual</label>
                <input
                  type="date"
                  value={penjualanForm.tanggal_jual}
                  onChange={(e) => setPenjualanForm({ ...penjualanForm, tanggal_jual: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Jumlah Terjual</label>
                <input
                  type="number"
                  step="0.01"
                  value={penjualanForm.jumlah_terjual}
                  onChange={(e) => setPenjualanForm({ ...penjualanForm, jumlah_terjual: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  max={selectedDetail.jumlah_sisa}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Nilai: Rp {(parseFloat(penjualanForm.jumlah_terjual || '0') * selectedDetail.harga_konsinyasi).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-gray-700 mb-3">Informasi Pembayaran</h4>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Tanggal Pembayaran</label>
                  <input
                    type="date"
                    value={penjualanForm.tanggal_pembayaran}
                    onChange={(e) => setPenjualanForm({ ...penjualanForm, tanggal_pembayaran: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Kas Tujuan</label>
                  {loadingKas ? (
                    <p className="text-sm text-gray-500">Loading kas...</p>
                  ) : (
                    <select
                      value={penjualanForm.kas_id}
                      onChange={(e) => setPenjualanForm({ ...penjualanForm, kas_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">-- Pilih Kas --</option>
                      {kasList.map((kas) => (
                        <option key={kas.id} value={kas.id}>
                          {kas.nama_kas} ({kas.tipe_kas}) - Saldo: Rp {kas.saldo.toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  )}
                  {kasList.length === 0 && !loadingKas && (
                    <p className="text-sm text-red-500 mt-1">Tidak ada kas tersedia untuk cabang ini</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Keterangan</label>
                <textarea
                  value={penjualanForm.keterangan}
                  onChange={(e) => setPenjualanForm({ ...penjualanForm, keterangan: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="submit" 
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
                  disabled={loadingKas || kasList.length === 0}
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition font-medium"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Retur */}
      {activeModal === 'retur' && selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Retur Barang</h3>
            <p className="text-sm text-gray-600 mb-4">
              Produk: <span className="font-medium">{selectedDetail.produk?.nama_produk}</span><br />
              Sisa: <span className="font-medium">{selectedDetail.jumlah_sisa}</span>
            </p>
            <form onSubmit={handleSubmitRetur} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Tanggal Retur</label>
                <input
                  type="date"
                  value={returForm.tanggal_retur}
                  onChange={(e) => setReturForm({ ...returForm, tanggal_retur: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Jumlah Retur</label>
                <input
                  type="number"
                  step="0.01"
                  value={returForm.jumlah_retur}
                  onChange={(e) => setReturForm({ ...returForm, jumlah_retur: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  max={selectedDetail.jumlah_sisa}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Kondisi</label>
                <select
                  value={returForm.kondisi}
                  onChange={(e) => setReturForm({ ...returForm, kondisi: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Baik">Baik</option>
                  <option value="Rusak">Rusak</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Keterangan</label>
                <textarea
                  value={returForm.keterangan}
                  onChange={(e) => setReturForm({ ...returForm, keterangan: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition font-medium">
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition font-medium"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}