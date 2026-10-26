"""
Unit & Integration Test Suite for DASHit Grocery Product Image & Catalog Enrichment Pipeline.
"""

import unittest
from unittest.mock import patch
import io
import os
import tempfile
from PIL import Image

from pipeline.normalizer import (
    clean_barcode,
    parse_pack_size,
    are_pack_sizes_compatible,
    extract_variant,
    normalize_product_record,
)
from pipeline.verifier import (
    compute_sha256,
    compute_dhash,
    hamming_distance,
    download_and_prefilter_image,
    calculate_candidate_score,
)
from pipeline.image_processor import normalize_to_square, process_and_save_catalog_image
from pipeline.orchestrator import CatalogEnrichmentPipeline, auto_detect_columns
from pipeline.db import EnrichmentDatabase


class TestProductNormalizer(unittest.TestCase):
    def test_barcode_cleaning(self):
        self.assertEqual(clean_barcode("8901058852331"), "8901058852331")
        self.assertEqual(clean_barcode(" 890-105-885-2331 "), "8901058852331")
        self.assertEqual(clean_barcode("30"), "30")
        self.assertIsNone(clean_barcode(None))

    def test_pack_size_parsing(self):
        # Grams
        res = parse_pack_size("70g")
        self.assertEqual(res["base_amount"], 70.0)
        self.assertEqual(res["base_unit"], "g")

        # Kilograms to Grams
        res_kg = parse_pack_size("1.5 kg")
        self.assertEqual(res_kg["base_amount"], 1500.0)
        self.assertEqual(res_kg["base_unit"], "g")

        # Milliliters
        res_ml = parse_pack_size("500 ml")
        self.assertEqual(res_ml["base_amount"], 500.0)
        self.assertEqual(res_ml["base_unit"], "ml")

        # Litres to Milliliters
        res_l = parse_pack_size("1 Litre")
        self.assertEqual(res_l["base_amount"], 1000.0)
        self.assertEqual(res_l["base_unit"], "ml")

        # Multipack
        res_multi = parse_pack_size("4 x 70g")
        self.assertEqual(res_multi["base_amount"], 280.0)
        self.assertEqual(res_multi["base_unit"], "g")

    def test_pack_size_compatibility(self):
        # 1 kg vs 1000g -> compatible
        sz_1kg = parse_pack_size("1 kg")
        sz_1000g = parse_pack_size("1000 g")
        self.assertTrue(are_pack_sizes_compatible(sz_1kg, sz_1000g))

        # 70g vs 140g -> incompatible
        sz_70 = parse_pack_size("70g")
        sz_140 = parse_pack_size("140g")
        self.assertFalse(are_pack_sizes_compatible(sz_70, sz_140))

        # 500ml vs 750ml -> incompatible
        sz_500 = parse_pack_size("500 ml")
        sz_750 = parse_pack_size("750 ml")
        self.assertFalse(are_pack_sizes_compatible(sz_500, sz_750))

    def test_variant_extraction(self):
        v1 = extract_variant("Maggi 2-Minute Masala Noodles", "Maggi")
        self.assertIn("2-Minute", v1)

        v2 = extract_variant("Maggi Special Masala Noodles", "Maggi")
        self.assertIn("Special Masala", v2)

        v3 = extract_variant("Amul Taaza Toned Milk", "Amul")
        self.assertIn("Toned", v3)

        v4 = extract_variant("Amul Gold Full Cream Milk", "Amul")
        self.assertIn("Full Cream", v4)


class TestImageVerificationAndHashing(unittest.TestCase):
    def test_perceptual_hash_and_sha256(self):
        # Create a solid color image
        img1 = Image.new("RGB", (400, 400), color=(255, 0, 0))
        buf1 = io.BytesIO()
        img1.save(buf1, format="JPEG")
        raw1 = buf1.getvalue()

        # Create exact duplicate
        raw2 = raw1
        img2 = Image.open(io.BytesIO(raw2))

        # Create slightly modified image (same content slightly brighter)
        img3 = Image.new("RGB", (400, 400), color=(250, 5, 5))

        sha1 = compute_sha256(raw1)
        sha2 = compute_sha256(raw2)
        self.assertEqual(sha1, sha2)

        dhash1 = compute_dhash(img1)
        dhash2 = compute_dhash(img2)
        dhash3 = compute_dhash(img3)

        self.assertEqual(dhash1, dhash2)
        # Hamming distance between nearly identical images should be 0
        self.assertEqual(hamming_distance(dhash1, dhash3), 0)

    def test_scoring_pack_size_mismatch_penalty(self):
        product_record = {
            "canonical_brand": "Maggi",
            "name": "Maggi 2-Minute Noodles",
            "variant": "2-Minute",
            "pack_size": parse_pack_size("70g"),
            "barcode": "8901058852331"
        }
        candidate = {
            "metadata": {
                "matched_by": "query_search_off",
                "off_brands": "Maggi",
                "off_product_name": "Maggi 2-Minute Noodles 140g",
                "off_quantity": "140g"  # Mismatched pack size!
            }
        }
        img_meta = {"width": 800, "height": 800}
        ocr_res = {"brand_found": True, "pack_size_found": False, "variant_found": True}

        score_res = calculate_candidate_score(candidate, product_record, img_meta, ocr_res)
        # Should be penalized and NOT auto-approved!
        self.assertFalse(score_res["pack_size_match"])
        self.assertNotEqual(score_res["status"], "AUTO_APPROVED")
        self.assertIn("PACK SIZE MISMATCH", score_res["reason"])


class TestImageProcessor(unittest.TestCase):
    def test_normalize_to_square(self):
        # Create rectangular image (600x300)
        img = Image.new("RGB", (600, 300), color=(200, 100, 50))
        squared = normalize_to_square(img, target_size=1024, clean_bg=False)

        self.assertEqual(squared.size, (1024, 1024))
        # Top-left corner should be white background padding
        pixel = squared.getpixel((10, 10))
        self.assertEqual(pixel, (255, 255, 255))

    def test_process_and_save_catalog_image(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            img = Image.new("RGB", (500, 500), color=(100, 150, 200))
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            raw_bytes = buf.getvalue()

            res = process_and_save_catalog_image(
                raw_bytes,
                img,
                identifier="8901234567890",
                output_dir=tmpdir,
                clean_bg=False
            )

            self.assertTrue(os.path.exists(res["original_path"]))
            self.assertTrue(os.path.exists(res["enriched_path"]))
            self.assertTrue(os.path.exists(res["thumbnail_path"]))

            # Verify enriched is 1024x1024
            with Image.open(res["enriched_path"]) as enriched_img:
                self.assertEqual(enriched_img.size, (1024, 1024))

            # Verify thumbnail is 256x256
            with Image.open(res["thumbnail_path"]) as thumb_img:
                self.assertEqual(thumb_img.size, (256, 256))


class TestPipelineOrchestrator(unittest.TestCase):
    def test_auto_detect_columns(self):
        headers1 = ["barcode", "product_name", "brand", "quantity", "price", "mrp"]
        m1 = auto_detect_columns(headers1)
        self.assertEqual(m1["barcode"], "barcode")
        self.assertEqual(m1["name"], "product_name")
        self.assertEqual(m1["unit"], "quantity")

        headers2 = ["EAN / UPC", "Item Title", "Company", "Packaging Size", "Selling Rate", "MRP Rate"]
        m2 = auto_detect_columns(headers2)
        self.assertEqual(m2["barcode"], "EAN / UPC")
        self.assertEqual(m2["name"], "Item Title")
        self.assertEqual(m2["brand"], "Company")
        self.assertEqual(m2["unit"], "Packaging Size")
        self.assertEqual(m2["price"], "Selling Rate")

    @patch("pipeline.orchestrator.download_and_prefilter_image")
    def test_pipeline_execution_and_csv_export(self, mock_download):
        test_img = Image.new("RGB", (400, 400), color=(255, 200, 100))
        buf = io.BytesIO()
        test_img.save(buf, format="JPEG")
        raw_data = buf.getvalue()
        mock_download.return_value = (
            raw_data,
            test_img,
            {
                "width": 400,
                "height": 400,
                "format": "JPEG",
                "mime_type": "image/jpeg",
                "file_size": len(raw_data),
                "sha256": compute_sha256(raw_data),
                "phash": compute_dhash(test_img),
            },
            None,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "test.db")
            output_dir = os.path.join(tmpdir, "products")

            pipeline = CatalogEnrichmentPipeline(db_path=db_path, output_dir=output_dir)

            sample_csv = """barcode,name,brand,category,unit,price,mrp
8901058000306,Maggi 2-Minute Masala Instant Noodles,Nestle,Instant Food,70g,14,14
8901262010016,Amul Pasteurized Butter Salted,Amul,Dairy,100 g,58,60
INVALID_99999,Nonexistent Fake Snack Item,UnknownBrand,Snacks,50g,10,12
"""
            rows, _ = pipeline.parse_csv_content(sample_csv)
            self.assertEqual(len(rows), 3)

            job_id = "TEST_JOB_001"
            pipeline.db.create_job(job_id, "test.csv", len(rows))
            summary = pipeline.process_job(job_id, rows, auto_approve_threshold=90.0)

            self.assertEqual(summary["total"], 3)
            # The two verified Indian catalog items should be auto-approved
            self.assertGreaterEqual(summary["approved"], 2)

            # Test Export Enriched CSV
            enriched_csv = pipeline.export_enriched_csv(job_id)
            self.assertIn("barcode,product_name,brand,category,pack_size,mrp,selling_price,image_url", enriched_csv)
            self.assertIn("8901058000306", enriched_csv)
            self.assertIn("8901262010016", enriched_csv)

            # Test Export Failed CSV
            failed_csv = pipeline.export_failed_csv(job_id)
            self.assertIn("barcode,product_name,reason,attempts,best_candidate,confidence,manual_action", failed_csv)
            self.assertIn("INVALID_99999", failed_csv)

    def test_ai_packshot_generation(self):
        from pipeline.ai_generator import generate_and_assign_ai_packshot
        with tempfile.TemporaryDirectory() as tmpdir:
            sample_product = {
                "id": "PROD_TEST_AI",
                "barcode": "8901262010016",
                "name": "Amul Pasteurized Butter Salted",
                "brand": "Amul",
                "category": "Dairy",
                "pack_size": "100 g"
            }
            res = generate_and_assign_ai_packshot(sample_product, output_dir=tmpdir)
            self.assertTrue(res["success"])
            self.assertEqual(res["confidence"], 0.98)
            self.assertEqual(res["source_name"], "ai_studio_generated")
            self.assertTrue(os.path.exists(res["local_path"]))
            img = Image.open(res["local_path"])
            self.assertEqual(img.size, (1024, 1024))
            self.assertEqual(img.format, "WEBP")


class TestMasterFMCGAssetBank(unittest.TestCase):
    def test_manifest_and_asset_files(self):
        from pipeline.sources import master_bank_registry
        self.assertTrue(master_bank_registry.manifest_path.exists())
        self.assertGreaterEqual(len(master_bank_registry.items), 30)

        # Verify every registered asset exists on disk with 1024x1024 dimensions
        assets_dir = master_bank_registry.manifest_path.parent
        for item in master_bank_registry.items[:10]:
            f_path = assets_dir / item["filename"]
            self.assertTrue(f_path.exists(), f"Asset file missing: {f_path}")
            with Image.open(f_path) as img:
                self.assertEqual(img.size, (1024, 1024))

    def test_exact_barcode_matching(self):
        from pipeline.sources import master_bank_registry
        m1 = master_bank_registry.find_match({"barcode": "30", "name": "Surf Excel"})
        self.assertIsNotNone(m1)
        self.assertEqual(m1["id"], "surf_excel_easy_wash_1kg")

        m2 = master_bank_registry.find_match({"barcode": "8901058000306", "name": "Maggi"})
        self.assertIsNotNone(m2)
        self.assertEqual(m2["id"], "maggi_masala_noodles_70g")

        m3 = master_bank_registry.find_match({"barcode": "8901719123870", "name": "Parle-G"})
        self.assertIsNotNone(m3)
        self.assertEqual(m3["id"], "parle_g_biscuits_250g")

    def test_false_positive_prevention(self):
        from pipeline.sources import master_bank_registry
        # Should not match Amul Butter
        self.assertIsNone(master_bank_registry.find_match({"name": "ACT II BUTTER POPCORN", "brand": "ACT II"}))
        self.assertIsNone(master_bank_registry.find_match({"name": "ALPINO PEANUT BUTTER SMOOTH", "brand": "ALPINO"}))
        # Should not match Fresh Oranges
        self.assertIsNone(master_bank_registry.find_match({"name": "AJWAH ORANGE CANDY", "brand": "AJWAH"}))
        # Should not match Fresh Green Coconut
        self.assertIsNone(master_bank_registry.find_match({"name": "AJWAH COCONUT LADOO", "brand": "AJWAH"}))

    def test_tier0_candidate_collection_and_score(self):
        from pipeline.sources import CandidateSourceCollector
        from pipeline.verifier import download_and_prefilter_image, calculate_candidate_score

        collector = CandidateSourceCollector()
        prod = {
            "barcode": "8901058000306",
            "name": "Maggi 2-Minute Masala Instant Noodles",
            "canonical_brand": "Nestle",
            "category": "Instant Food"
        }
        cands = collector.collect_candidates(prod)
        self.assertGreaterEqual(len(cands), 1)

        tier0 = cands[0]
        self.assertEqual(tier0["source_name"], "master_fmcg_asset_bank")
        self.assertEqual(tier0["source_priority"], 0)

        raw_bytes, pil_img, meta, err = download_and_prefilter_image(tier0["url"])
        self.assertIsNone(err)
        self.assertIsNotNone(pil_img)
        self.assertEqual(pil_img.size, (1024, 1024))

        score_res = calculate_candidate_score(tier0, prod, meta, {})
        self.assertEqual(score_res["status"], "AUTO_APPROVED")
        self.assertEqual(score_res["confidence"], 0.99)
        self.assertEqual(score_res["score"], 100.0)


if __name__ == "__main__":
    unittest.main()
