/*
 Janz SmartIO water meter driver.

 Manufacturer: JGF (Janz Contagem e Gestao de Fluidos, Portugal)
 Type: 0x07 (Water meter), Version: 0x20 / 0x10

 Fields extracted:
   - total_m3, total_backward_m3, volume_flow_m3h (library)
   - meter_datetime (library)
   - flow_temperature_c (library)
   - status (error flags + TPL status)
   - target_m3 / target_date (previous billing period, storage 1)
   - battery_y (vendor field 02FD74, days scaled to years)
*/

#include"meters_common_implementation.h"

namespace
{
    struct Driver : public virtual MeterCommonImplementation
    {
        Driver(MeterInfo &mi, DriverInfo &di);
    };

    static bool ok = staticRegisterDriver([](DriverInfo&di)
    {
        di.setName("janz");
        di.setDefaultFields("name,id,total_m3,target_m3,flow_temperature_c,timestamp");
        di.setMeterType(MeterType::WaterMeter);
        di.addLinkMode(LinkMode::T1);
        di.addMVT(MANUFACTURER_JGF,  0x07,  0x20);
        di.addMVT(MANUFACTURER_JGF,  0x07,  0x10);
        di.setConstructor([](MeterInfo& mi, DriverInfo& di){ return shared_ptr<Meter>(new Driver(mi, di)); });
    });

    Driver::Driver(MeterInfo &mi, DriverInfo &di) : MeterCommonImplementation(mi, di)
    {
        setMeterType(MeterType::WaterMeter);

        setExpectedTPLSecurityMode(TPLSecurityMode::AES_CBC_IV);

        addLinkMode(LinkMode::T1);

        addOptionalLibraryFields("total_m3,total_backward_m3,volume_flow_m3h,meter_datetime,flow_temperature_c");

        addStringFieldWithExtractorAndLookup(
            "status",
            "Status and error flags.",
            DEFAULT_PRINT_PROPERTIES | PrintProperty::STATUS | PrintProperty::INCLUDE_TPL_STATUS,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::ErrorFlags)
            .add(VIFCombinable::RecordErrorCodeMeterToController),
            {
                {
                    {
                        "ERROR_FLAGS",
                        Translate::MapType::BitToString,
                        AlwaysTrigger, MaskBits(0xffffff),
                        "OK",
                        {
                        }
                    },
                },
            });

        addNumericFieldWithExtractor(
            "target",
            "The total water consumption recorded at the end of previous billing period.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Volume,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::Volume)
            .set(StorageNr(1))
            );

        addStringFieldWithExtractor(
            "target_date",
            "Date when previous billing period ended.",
            DEFAULT_PRINT_PROPERTIES,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::Date)
            .set(StorageNr(1))
            );

        addNumericFieldWithExtractor(
            "battery",
            "Estimated battery lifetime remaining.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Time,
            VifScaling::None, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(DifVifKey("02FD74")),
            Unit::Year,
            0.0027397260273972603);
    }
}

// Test: JanzWater janz 25010812 534D415254494F574D4255534A414E5A
// telegram=|4144e6281208012520078c009f7a9d80300529d058d83d1914769411e9ea9da78fa255e11d27c8ed911978b431a1d55b56d85eb02d3e096a15bf9c190896ce4b6535|
// {"_":"telegram","media":"water","meter":"janz","name":"JanzWater","id":"25010812","meter_datetime":"2026-04-10 04:38","total_m3":0.1916,"total_backward_m3":0.0001,"status":"ERROR_FLAGS_A0 UNKNOWN_80","target_m3":0,"target_date":"2026-04-01","flow_temperature_c":14.01,"battery_y":15.49,"timestamp":"1111-11-11T11:11:11Z"}
// |JanzWater;25010812;0.1916;0;14.01;1111-11-11 11:11.11
