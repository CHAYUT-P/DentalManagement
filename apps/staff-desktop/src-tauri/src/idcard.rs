//! Reads a Thai national ID card through a PC/SC smart-card reader.
//!
//! The card holds a small file system behind the MOI applet; each field sits
//! at a fixed offset and is read with `80 B0 <offset> 02 00 <len>`, followed
//! by GET RESPONSE. Text is TIS-620 (Thai) and dates are Buddhist-era
//! YYYYMMDD.

use pcsc::{Context, Protocols, Scope, ShareMode};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThaiIdCard {
    cid: String,
    prefix_th: String,
    first_th: String,
    last_th: String,
    prefix_en: String,
    first_en: String,
    last_en: String,
    /// YYYY-MM-DD (Christian era)
    birthdate: String,
    /// "male" | "female" | ""
    gender: String,
    address: String,
    issue_date: String,
    expire_date: String,
}

const SELECT_MOI: [u8; 13] = [0x00, 0xA4, 0x04, 0x00, 0x08, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01];

/// TIS-620 → UTF-8: ASCII as is, Thai block 0xA1–0xFB maps onto U+0E01–U+0E5B.
fn tis620(bytes: &[u8]) -> String {
    bytes
        .iter()
        .filter_map(|&b| match b {
            0x00 => None,
            0x01..=0x7F => Some(b as char),
            0xA1..=0xFB => char::from_u32(0x0E00 + (b as u32 - 0xA0)),
            _ => None,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// "25480315" (B.E.) → "2005-03-15"
fn be_date(raw: &str) -> String {
    let d: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    if d.len() != 8 {
        return String::new();
    }
    let y: i32 = d[0..4].parse().unwrap_or(0);
    if y < 2400 {
        return String::new();
    }
    format!("{}-{}-{}", y - 543, &d[4..6], &d[6..8])
}

/// "นาย#สมชาย##ใจดี" → (prefix, first, last)
fn split_name(raw: &str) -> (String, String, String) {
    let parts: Vec<&str> = raw.split('#').collect();
    let get = |i: usize| parts.get(i).map(|s| s.trim().to_string()).unwrap_or_default();
    let last = parts.iter().rev().find(|s| !s.trim().is_empty()).map(|s| s.trim().to_string()).unwrap_or_default();
    (get(0), get(1), if parts.len() > 2 { last } else { String::new() })
}

struct Card {
    card: pcsc::Card,
    /// some cards answer GET RESPONSE only with P2 = 01
    get_response_p2: u8,
}

impl Card {
    fn read(&self, offset: u16, len: u8) -> Result<Vec<u8>, String> {
        let mut buf = [0u8; 300];
        let cmd = [0x80, 0xB0, (offset >> 8) as u8, (offset & 0xFF) as u8, 0x02, 0x00, len];
        self.card.transmit(&cmd, &mut buf).map_err(|e| format!("อ่านบัตรไม่สำเร็จ ({e})"))?;
        let get = [0x00, 0xC0, 0x00, self.get_response_p2, len];
        let resp = self.card.transmit(&get, &mut buf).map_err(|e| format!("อ่านบัตรไม่สำเร็จ ({e})"))?;
        // drop the trailing status word (90 00)
        Ok(resp[..resp.len().saturating_sub(2)].to_vec())
    }

    fn text(&self, offset: u16, len: u8) -> Result<String, String> {
        Ok(tis620(&self.read(offset, len)?))
    }
}

#[tauri::command]
pub fn read_thai_id() -> Result<ThaiIdCard, String> {
    let ctx = Context::establish(Scope::User).map_err(|_| "ไม่พบระบบเครื่องอ่านบัตรในเครื่องนี้".to_string())?;
    let mut names = [0u8; 2048];
    let reader = ctx
        .list_readers(&mut names)
        .map_err(|_| "ไม่พบเครื่องอ่านบัตร — เสียบเครื่องอ่านบัตรก่อน".to_string())?
        .next()
        .ok_or_else(|| "ไม่พบเครื่องอ่านบัตร — เสียบเครื่องอ่านบัตรก่อน".to_string())?;
    let card = ctx
        .connect(reader, ShareMode::Shared, Protocols::ANY)
        .map_err(|_| "ยังไม่ได้เสียบบัตรประชาชน".to_string())?;

    // which GET RESPONSE this card wants depends on its ATR
    let mut atr_buf = [0u8; 64];
    let mut name_buf = [0u8; 256];
    let atr = card
        .status2(&mut name_buf, &mut atr_buf)
        .map(|s| s.atr().to_vec())
        .unwrap_or_default();
    let get_response_p2 = if atr.len() > 1 && atr[0] == 0x3B && atr[1] == 0x67 { 0x01 } else { 0x00 };

    let mut buf = [0u8; 64];
    card.transmit(&SELECT_MOI, &mut buf).map_err(|_| "บัตรนี้ไม่ใช่บัตรประชาชน".to_string())?;
    let c = Card { card, get_response_p2 };

    let (prefix_th, first_th, last_th) = split_name(&c.text(0x0011, 0x64)?);
    let (prefix_en, first_en, last_en) = split_name(&c.text(0x0075, 0x64)?);
    let gender = match c.text(0x00E1, 0x01)?.as_str() {
        "1" => "male",
        "2" => "female",
        _ => "",
    }
    .to_string();
    let address = c.text(0x1579, 0x64)?.split('#').map(str::trim).filter(|s| !s.is_empty()).collect::<Vec<_>>().join(" ");

    Ok(ThaiIdCard {
        cid: c.text(0x0004, 0x0D)?,
        prefix_th,
        first_th,
        last_th,
        prefix_en,
        first_en,
        last_en,
        birthdate: be_date(&c.text(0x00D9, 0x08)?),
        gender,
        address,
        issue_date: be_date(&c.text(0x0167, 0x08)?),
        expire_date: be_date(&c.text(0x016F, 0x08)?),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_thai_text_and_dates() {
        // "สมชาย" in TIS-620
        assert_eq!(tis620(&[0xCA, 0xC1, 0xAA, 0xD2, 0xC2, 0x20, 0x00]), "สมชาย");
        assert_eq!(be_date("25480315"), "2005-03-15");
        assert_eq!(split_name("นาย#สมชาย##ใจดี"), ("นาย".into(), "สมชาย".into(), "ใจดี".into()));
    }
}
