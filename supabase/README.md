# Supabase Database Migrations — Travel & Challenge

โฟลเดอร์นี้เก็บไฟล์ SQL Schema ทั้งหมดของระบบ สำหรับนำไปรันใน **Supabase SQL Editor**:

| ลำดับ | ไฟล์ | รายละเอียด |
|---|---|---|
| 001 | `001_foundation.sql` | โครงสร้างพื้นฐาน: `profiles`, `places`, `provinces`, `place_images` |
| 002 | `002_quests_rewards.sql` | ระบบเควสต์ & กระเป๋าโทเคน: `quests`, `user_quests`, `token_transactions` |
| 003 | `003_journal.sql` | ระบบไดอารี่บันทึกการเดินทาง: `travel_diaries`, `diary_photos` |
| 004 | `004_campaigns_admin.sql` | แคมเปญ & พาร์ทเนอร์: `campaigns`, `campaign_places`, `audit_logs` |
| 005 | `005_trips_achievements.sql` | แผนการเดินทาง: `trips`, `trip_places` |
| 006 | `006_seed_bangkok.sql` | ข้อมูลเริ่มต้นสถานที่และเควสต์ในกรุงเทพฯ |
| 007 | `007_game_and_cloud_sync.sql` | รองรับการซิงค์ชุดตัวละครและเซฟเกม AR |

---

### ต้องนำไปใส่ใน Supabase หรือไม่?

1. **ถ้าใช้โปรเจกต์ Supabase เดิม (`tnoemhibqtrjpccnwfzz.supabase.co`)**:
   - ฐานข้อมูลมีตารางหลัก (`profiles`, `places`, `quests`, `campaigns` ฯลฯ) ทำงานอยู่แล้วตามปกติ
   - สามารถนำเฉพาะไฟล์ **`007_game_and_cloud_sync.sql`** ไปกด **Run** ใน Supabase SQL Editor เพิ่มเติมได้ (เพื่อเพิ่มคอลัมน์ `outfit` และ `game_save` ให้สมบูรณ์แบบยิ่งขึ้น)

2. **ถ้าสร้าง Supabase Project ใหม่จากศูนย์**:
   - ให้เปิด **Supabase Dashboard** -> เข้าเมนู **SQL Editor**
   - Copy เนื้อหาตั้งแต่ไฟล์ `001` ถึง `007` ไปวางแล้วกด **Run** ทีละไฟล์ตามลำดับ
