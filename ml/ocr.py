import os
import logging
import fitz  # PyMuPDF
import pytesseract
from pdf2image import convert_from_path

logger = logging.getLogger(__name__)

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text from a PDF file. 
    First tries digital text extraction using PyMuPDF.
    If the text length is very short (likely scanned PDF), falls back to OCR via pdf2image and pytesseract.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    text = ""
    try:
        # Try digital extraction first
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        logger.warning(f"Digital text extraction failed or was incomplete: {e}. Trying OCR.")

    # Clean text to measure quality
    cleaned_text = text.strip()
    
    # If the text is very short (less than 150 chars), it's likely a scanned PDF
    if len(cleaned_text) < 150:
        logger.info(f"Digital text extracted only {len(cleaned_text)} characters. Falling back to OCR.")
        text = extract_text_via_ocr(file_path)
        
    return text

def extract_text_via_ocr(file_path: str) -> str:
    """
    Converts PDF pages into images and runs Tesseract OCR on them.
    """
    ocr_text = ""
    try:
        # Convert PDF to list of PIL Images
        # Note: In production Docker, poppler-utils must be installed for this to work
        images = convert_from_path(file_path)
        
        for i, image in enumerate(images):
            logger.info(f"Performing OCR on page {i+1}/{len(images)}...")
            # Run pytesseract OCR
            # Note: In production Docker, tesseract-ocr must be installed
            page_text = pytesseract.image_to_string(image)
            ocr_text += page_text + "\n"
            
    except Exception as e:
        error_msg = (
            f"OCR extraction failed: {str(e)}. "
            "Please ensure 'tesseract' and 'poppler-utils' are installed on your system or run inside Docker."
        )
        logger.error(error_msg)
        # Return whatever digital text was found as a fallback, or raise if empty
        if not ocr_text:
            raise RuntimeError(error_msg)

    return ocr_text
