<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LedgerAccount extends Model
{
    protected $fillable = ['tenant_id', 'code', 'name', 'type', 'currency'];
}
